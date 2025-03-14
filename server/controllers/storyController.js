const { OpenAI } = require('openai');
const { 
  Story, 
  User, 
  UserReadStories, 
  UserUpvotedStories,
  Vocabulary,
  Grammar 
} = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const fallbackStories = require('../utils/fallbackStories');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY 
});

// @desc    Generate a new story using ChatGPT
// @route   GET /api/stories/generate
// @access  Private
const generateStory = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    console.log(`Generating story for user: ${user.id} (${user.username})`);
    
    // Extract parameters from query, defaulting to user preferences
    const { 
      length = user.preferences.storyLength, 
      topic = user.preferences.topics[0],
      waniKaniLevel = user.waniKaniLevel,
      genkiChapter = user.genkiChapter
    } = req.query;
    
    // Construct prompt for ChatGPT
    const prompt = `
      Write a Tadoku-style Japanese graded reader story for a learner at WaniKani Level ${waniKaniLevel} 
      and Genki Chapter ${genkiChapter}. The story should be ${length} 
      (short: 100-200 words, medium: 200-400 words, long: 400-600 words) and about ${topic}. 
      Use simple sentences, limit kanji to WaniKani Level ${waniKaniLevel}, 
      and grammar to Genki Chapter ${genkiChapter}.
      
      IMPORTANT FORMATTING:
      1. For the first appearance of any kanji word, add furigana in parentheses immediately after the word. Example: 私(わたし)は日本(にほん)に行きました。
      2. For subsequent appearances of the same kanji word, do NOT include furigana again.
      3. Include a title as the first line.
      4. Avoid complex vocabulary or idioms beyond the learner's level.
      
      After writing the Japanese story, please provide an English translation of the entire story, 
      preceded by "[ENGLISH_TRANSLATION]" on a new line to separate it from the Japanese version.
    `;

    try {
      // Attempt to call OpenAI API
      console.log(`Sending prompt to OpenAI for story generation about ${topic} at WaniKani level ${waniKaniLevel}`);
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
      });

      const generatedText = response.choices[0].message.content;
      
      // Check if there's an English translation
      const parts = generatedText.split('[ENGLISH_TRANSLATION]');
      const japaneseText = parts[0].trim();
      
      // Ensure we have an English translation, even if the marker wasn't included
      let englishContent = '';
      if (parts.length > 1) {
        englishContent = parts[1].trim();
      } else {
        // Try to get a translation separately
        console.log("No [ENGLISH_TRANSLATION] marker found, requesting a separate translation");
        try {
          console.log('Generating English translation...');
          const translationPrompt = `Please translate the following Japanese text to English. Maintain paragraph breaks and the original meaning:
${japaneseText}`;
          
          const translationResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: translationPrompt }],
            max_tokens: 1000,
          });
          
          englishContent = translationResponse.choices[0].message.content.trim();
        } catch (translationError) {
          console.error('Error getting translation:', translationError);
          englishContent = 'Translation not available. Please try again later.';
        }
      }
      
      console.log(`Generated Japanese content (${japaneseText.length} chars) and English translation (${englishContent.length} chars)`);
      console.log(`English translation available: ${englishContent.length > 0 ? 'Yes' : 'No'}`);
      
      // Parse the Japanese text to extract title and content
      const lines = japaneseText.split('\n').filter(line => line.trim());
      let title = lines[0];
      // Remove any special characters that might be formatting the title
      title = title.replace(/^[#*\-–—]+\s*/, '');
      
      // The rest is content (skipping any empty lines after title)
      const content = lines.slice(1).join('\n').trim();

      // Create and save the new story
      const story = await Story.create({
        title,
        content,
        englishContent,
        userId: req.user.id,
        kanjiLevel: parseInt(waniKaniLevel, 10),
        grammarLevel: parseInt(genkiChapter, 10),
        length,
        topic,
      });

      console.log(`Story created with ID: ${story.id} for user: ${user.username}`);
      console.log(`English content saved: ${story.englishContent ? 'Yes' : 'No'} (${story.englishContent?.length || 0} chars)`);

      res.json({
        storyId: story.id,
        title: story.title,
        content: story.content,
        englishContent: story.englishContent,
        kanjiLevel: story.kanjiLevel,
        grammarLevel: story.grammarLevel,
        length: story.length,
        topic: story.topic,
      });
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError);
      
      // Use fallback story when OpenAI API fails
      console.log('Using fallback story due to OpenAI API error');
      
      // Select a fallback story based on length
      const fallbackStory = fallbackStories.find(s => s.length === length) || fallbackStories[0];
      
      // Create and save the fallback story
      const story = await Story.create({
        title: fallbackStory.title,
        content: fallbackStory.content,
        englishContent: fallbackStory.englishContent,
        userId: req.user.id,
        kanjiLevel: parseInt(waniKaniLevel, 10),
        grammarLevel: parseInt(genkiChapter, 10),
        length,
        topic,
      });

      console.log(`Fallback story created with ID: ${story.id} for user: ${user.username}`);

      res.json({
        storyId: story.id,
        title: story.title,
        content: story.content,
        englishContent: story.englishContent,
        kanjiLevel: story.kanjiLevel,
        grammarLevel: story.grammarLevel,
        length: story.length,
        topic: story.topic,
      });
    }
  } catch (error) {
    console.error('Error generating story:', error);
    res.status(500).json({
      message: 'Story generation failed',
      error: error.message,
    });
  }
};

// @desc    Get a specific story by ID
// @route   GET /api/stories/:id
// @access  Private
const getStoryById = async (req, res) => {
  try {
    const story = await Story.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        }
      ]
    });
    
    if (!story) {
      res.status(404);
      throw new Error('Story not found');
    }
    
    // Check if the user has upvoted this story
    let hasUpvoted = false;
    if (req.user) {
      // Get the join table model
      const UserUpvotedStories = req.app.get('sequelize').model('UserUpvotedStories');
      
      // Check if the upvote relationship exists
      const upvote = await UserUpvotedStories.findOne({
        where: {
          userId: req.user.id,
          storyId: story.id
        }
      });
      
      hasUpvoted = !!upvote;
    }
    
    res.json({
      storyId: story.id,
      title: story.title,
      content: story.content,
      englishContent: story.englishContent || '',
      kanjiLevel: story.kanjiLevel,
      grammarLevel: story.grammarLevel,
      length: story.length,
      topic: story.topic,
      createdAt: story.createdAt,
      user: story.user,
      upvoteCount: story.upvoteCount || 0,
      hasUpvoted
    });
  } catch (error) {
    res.status(404).json({
      message: 'Story not found',
      error: error.message,
    });
  }
};

// @desc    Mark a story as completed
// @route   POST /api/stories/:id/complete
// @access  Private
const markStoryAsComplete = async (req, res) => {
  try {
    const userId = req.user.id;
    const storyId = req.params.id;
    
    // Check if story exists
    const story = await Story.findByPk(storyId);
    if (!story) {
      res.status(404);
      throw new Error('Story not found');
    }
    
    // Get the join table model
    const UserReadStories = req.app.get('sequelize').model('UserReadStories');
    
    // Check if the user has already read this story
    const readRecord = await UserReadStories.findOne({
      where: {
        userId,
        storyId
      }
    });
    
    // If not already read, create the record
    if (!readRecord) {
      await UserReadStories.create({
        userId,
        storyId,
        completedAt: new Date()
      });
    }
    
    res.json({ success: true, message: 'Story marked as completed' });
  } catch (error) {
    res.status(400).json({
      message: 'Failed to mark story as complete',
      error: error.message,
    });
  }
};

// @desc    Analyze story content to extract vocabulary and grammar
// @access  Private (internal function)
const analyzeStoryContent = async (story, user) => {
  try {
    if (!story || !story.content) {
      console.error('Invalid story provided for analysis');
      return null;
    }

    console.log(`Analyzing story content for ID: ${story.id}`);

    // Construct prompt for GPT-4o
    const prompt = `
      You are a Japanese language teacher analyzing a story for a student at WaniKani Level ${story.kanjiLevel} 
      and Genki Chapter ${story.grammarLevel}.
      
      Story Title: ${story.title}
      Story Content:
      ${story.content}
      
      Please provide:
      
      1. A comprehensive vocabulary list with the following for each important word in the story:
         - Word in Japanese (kanji if applicable)
         - Reading (furigana)
         - Detailed meaning(s) in English
         - 2-3 example sentences showing different usages
         - Notes on nuance, context, or usage
         - Cultural relevance if applicable
      
      2. A detailed grammar analysis covering:
         - Each grammar point used in the story
         - Clear explanation of how the grammar works
         - Multiple example sentences beyond those in the story
         - Common mistakes learners make with this grammar
         - When and how to use this grammar pattern vs. similar patterns
         
      Format your response as structured JSON WITHOUT any markdown formatting, code blocks, or backticks. Provide ONLY the raw JSON data with this format:
      {
        "vocabulary": [
          {
            "word": "日本語",
            "reading": "にほんご",
            "meaning": "Japanese language",
            "examples": [
              {
                "sentence": "私は日本語を勉強しています。",
                "translation": "I am studying Japanese."
              }
            ],
            "notes": "Notes about usage or cultural context"
          }
        ],
        "grammarPoints": [
          {
            "rule": "は (Topic Marker)",
            "explanation": "Detailed explanation of the grammar point",
            "examples": [
              {
                "sentence": "私は学生です。",
                "translation": "I am a student."
              }
            ],
            "commonMistakes": "Information about common errors",
            "similarPatterns": "Comparison with similar grammar patterns"
          }
        ]
      }
    `;

    // Call OpenAI API for analysis
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.7,
    });

    // Get the raw response content
    const rawContent = response.choices[0].message.content;
    
    // Log the raw response for debugging
    console.log(`Raw GPT-4o response for story ${story.id}:`);
    console.log(rawContent);
    
    // Create a file with the raw response for future reference
    const responseLogDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(responseLogDir)) {
      fs.mkdirSync(responseLogDir, { recursive: true });
    }
    const logFileName = path.join(responseLogDir, `story-analysis-${story.id}-${Date.now()}.json`);
    fs.writeFileSync(logFileName, rawContent);
    console.log(`Logged raw response to: ${logFileName}`);

    let analysisResult;
    try {
      // Clean the response content by removing markdown formatting
      let cleanContent = rawContent.trim();
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```') && cleanContent.includes('\n')) {
        // Extract content between code blocks
        const startIdx = cleanContent.indexOf('\n') + 1;
        let endIdx = cleanContent.lastIndexOf('```');
        if (endIdx === -1) endIdx = cleanContent.length;
        cleanContent = cleanContent.substring(startIdx, endIdx).trim();
      }
      
      // If we still see a JSON opening bracket not at the start, trim anything before it
      const jsonStartIdx = cleanContent.indexOf('{');
      if (jsonStartIdx > 0) {
        cleanContent = cleanContent.substring(jsonStartIdx);
      }
      
      console.log('Cleaned content for parsing:');
      console.log(cleanContent.substring(0, 100) + '...'); // Log the start of the cleaned content
      
      // Parse the JSON response
      analysisResult = JSON.parse(cleanContent);
      
      // Basic validation
      if (!analysisResult.vocabulary || !analysisResult.grammarPoints) {
        console.error('Incomplete analysis result from GPT-4o - missing vocabulary or grammarPoints');
        return null;
      }
    } catch (parseError) {
      console.error('Error parsing GPT-4o response:', parseError);
      console.error('First 200 characters of cleaned content: ', rawContent.substring(0, 200));
      return null;
    }

    return analysisResult;
  } catch (error) {
    console.error('Error analyzing story content:', error);
    return null;
  }
};

// @desc    Save vocabulary from analysis to database
// @access  Private (internal function)
const saveVocabularyToDatabase = async (vocabularyItems, storyId) => {
  try {
    const story = await Story.findByPk(storyId);
    if (!story) {
      console.error(`Story not found with ID: ${storyId}`);
      return [];
    }

    // Get the models from the sequelize instance
    const sequelize = Story.sequelize;
    const Vocabulary = sequelize.model('Vocabulary');
    const StoryVocabulary = sequelize.model('StoryVocabulary');
    
    // Clear existing vocabulary for this story
    await StoryVocabulary.destroy({
      where: { storyId }
    });

    // Process and save each vocabulary item
    const savedItems = [];
    for (const item of vocabularyItems) {
      // Check if vocab already exists in database
      let vocabDoc = await Vocabulary.findOne({ 
        where: {
          word: item.word,
          reading: item.reading
        }
      });

      // If not found, create a new vocabulary entry
      if (!vocabDoc) {
        vocabDoc = await Vocabulary.create({
          word: item.word,
          reading: item.reading,
          meaning: item.meaning,
          kanjiLevel: story.kanjiLevel,
          exampleSentences: JSON.stringify(item.examples || []),
          notes: item.notes || ''
        });
      } else {
        // Update existing vocabulary with any new example sentences
        if (item.examples && item.examples.length > 0) {
          let existingExamples = [];
          try {
            existingExamples = JSON.parse(vocabDoc.exampleSentences || '[]');
          } catch (e) {
            console.error('Error parsing existing examples:', e);
            existingExamples = [];
          }
          
          const existingSentences = existingExamples.map(ex => ex.sentence);
          
          for (const example of item.examples) {
            if (!existingSentences.includes(example.sentence)) {
              existingExamples.push(example);
            }
          }
          
          // Add notes if they exist and are new
          const updatedFields = {
            exampleSentences: JSON.stringify(existingExamples)
          };
          
          if (item.notes && (!vocabDoc.notes || vocabDoc.notes !== item.notes)) {
            updatedFields.notes = item.notes;
          }
          
          await vocabDoc.update(updatedFields);
        }
      }

      // Create association between story and vocabulary
      await StoryVocabulary.create({
        storyId,
        vocabularyId: vocabDoc.id,
        frequency: 1
      });

      savedItems.push(vocabDoc);
    }

    return savedItems;
  } catch (error) {
    console.error('Error saving vocabulary to database:', error);
    return [];
  }
};

// @desc    Save grammar points from analysis to database
// @access  Private (internal function)
const saveGrammarToDatabase = async (grammarPoints, storyId) => {
  try {
    const story = await Story.findByPk(storyId);
    if (!story) {
      console.error(`Story not found with ID: ${storyId}`);
      return [];
    }

    // Get the models from the sequelize instance
    const sequelize = Story.sequelize;
    const Grammar = sequelize.model('Grammar');
    const StoryGrammar = sequelize.model('StoryGrammar');
    
    // Clear existing grammar points for this story
    await StoryGrammar.destroy({
      where: { storyId }
    });

    // Process and save each grammar point
    const savedItems = [];
    for (const item of grammarPoints) {
      // Check if grammar point already exists in database
      let grammarDoc = await Grammar.findOne({ 
        where: { rule: item.rule }
      });

      // If not found, create a new grammar entry
      if (!grammarDoc) {
        grammarDoc = await Grammar.create({
          rule: item.rule,
          genkiChapter: story.grammarLevel,
          explanation: item.explanation,
          examples: JSON.stringify(item.examples || []),
          commonMistakes: item.commonMistakes || '',
          similarPatterns: item.similarPatterns || ''
        });
      } else {
        // Update existing grammar with any new information
        const updatedFields = {};
        
        if (item.explanation && grammarDoc.explanation !== item.explanation) {
          updatedFields.explanation = item.explanation;
        }
        
        if (item.examples && item.examples.length > 0) {
          let existingExamples = [];
          try {
            existingExamples = JSON.parse(grammarDoc.examples || '[]');
          } catch (e) {
            console.error('Error parsing existing examples:', e);
            existingExamples = [];
          }
          
          const existingSentences = existingExamples.map(ex => ex.sentence);
          
          for (const example of item.examples) {
            if (!existingSentences.includes(example.sentence)) {
              existingExamples.push(example);
            }
          }
          
          updatedFields.examples = JSON.stringify(existingExamples);
        }
        
        // Add other information if it exists and is new
        if (item.commonMistakes) {
          updatedFields.commonMistakes = item.commonMistakes;
        }
        
        if (item.similarPatterns) {
          updatedFields.similarPatterns = item.similarPatterns;
        }
        
        if (Object.keys(updatedFields).length > 0) {
          await grammarDoc.update(updatedFields);
        }
      }

      // Create association between story and grammar
      await StoryGrammar.create({
        storyId,
        grammarId: grammarDoc.id
      });

      savedItems.push(grammarDoc);
    }

    return savedItems;
  } catch (error) {
    console.error('Error saving grammar points to database:', error);
    return [];
  }
};

// @desc    Get vocabulary and grammar review for a story
// @route   GET /api/stories/:id/review
// @access  Private
const getStoryReview = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({
        message: 'Story ID is required',
      });
    }

    console.log(`Fetching review data for story ID: ${req.params.id}`);
    const story = await Story.findByPk(req.params.id);
    
    if (!story) {
      console.log(`Story with ID ${req.params.id} not found`);
      return res.status(404).json({
        message: 'Story not found',
      });
    }
    
    // Get vocabulary items for this story
    const Vocabulary = req.app.get('sequelize').model('Vocabulary');
    const StoryVocabulary = req.app.get('sequelize').model('StoryVocabulary');
    
    const vocabularyItems = await StoryVocabulary.findAll({
      where: { storyId: req.params.id },
      include: [{
        model: Vocabulary,
        as: 'word'
      }]
    });
    
    // Get grammar points for this story
    const Grammar = req.app.get('sequelize').model('Grammar');
    const StoryGrammar = req.app.get('sequelize').model('StoryGrammar');
    
    const grammarPoints = await StoryGrammar.findAll({
      where: { storyId: req.params.id },
      include: [{
        model: Grammar,
        as: 'grammar'
      }]
    });
    
    console.log(`Story ${req.params.id} status - hasVocabulary: ${vocabularyItems.length > 0} (${vocabularyItems.length} items), hasGrammarPoints: ${grammarPoints.length > 0} (${grammarPoints.length} items)`);
    
    // If missing vocabulary or grammar points, analyze the story content
    if (vocabularyItems.length === 0 || grammarPoints.length === 0) {
      console.log(`Story ${req.params.id} needs analysis - vocab: ${vocabularyItems.length > 0}, grammar: ${grammarPoints.length > 0}`);
      
      // Get user for context
      const user = await User.findByPk(req.user.id);
      if (!user) {
        console.error(`User with ID ${req.user.id} not found when trying to analyze story`);
        return res.status(404).json({
          message: 'User not found',
        });
      }
      
      // Analyze story content
      const analysis = await analyzeStoryContent(story, user);
      
      if (analysis) {
        console.log(`Analysis complete for story ${req.params.id} - received vocabulary: ${analysis.vocabulary?.length || 0}, grammar: ${analysis.grammarPoints?.length || 0}`);
        
        // Save vocabulary and grammar points to database
        if (vocabularyItems.length === 0 && analysis.vocabulary) {
          console.log(`Saving ${analysis.vocabulary.length} vocabulary items to database for story ${req.params.id}`);
          const savedVocab = await saveVocabularyToDatabase(analysis.vocabulary, req.params.id);
          console.log(`Saved ${savedVocab.length} vocabulary items successfully`);
        }
        
        if (grammarPoints.length === 0 && analysis.grammarPoints) {
          console.log(`Saving ${analysis.grammarPoints.length} grammar points to database for story ${req.params.id}`);
          const savedGrammar = await saveGrammarToDatabase(analysis.grammarPoints, req.params.id);
          console.log(`Saved ${savedGrammar.length} grammar points successfully`);
        }
      } else {
        console.log(`No analysis results returned for story ${req.params.id}`);
      }
      
      // Reload vocabulary and grammar after analysis
      const updatedVocabularyItems = await StoryVocabulary.findAll({
        where: { storyId: req.params.id },
        include: [{
          model: Vocabulary,
          as: 'word'
        }]
      });
      
      const updatedGrammarPoints = await StoryGrammar.findAll({
        where: { storyId: req.params.id },
        include: [{
          model: Grammar,
          as: 'grammar'
        }]
      });
      
      // Transform the data for API response
      const response = {
        vocabulary: updatedVocabularyItems.map(item => ({
          ...item.toJSON(),
          wordId: item.word
        })),
        grammarPoints: updatedGrammarPoints.map(item => item.grammar)
      };
      
      console.log(`Returning review data with ${response.vocabulary.length} vocab items and ${response.grammarPoints.length} grammar points`);
      return res.json(response);
    }
    
    // Transform the data for API response if we didn't need to analyze
    const response = {
      vocabulary: vocabularyItems.map(item => ({
        ...item.toJSON(),
        wordId: item.word
      })),
      grammarPoints: grammarPoints.map(item => item.grammar)
    };
    
    console.log(`Returning review data with ${response.vocabulary.length} vocab items and ${response.grammarPoints.length} grammar points`);
    return res.json(response);
  } catch (error) {
    console.error('Error in getStoryReview:', error);
    return res.status(500).json({
      message: 'Error retrieving story review data',
      error: error.message,
    });
  }
};

// @desc    Get stories for a user
// @route   GET /api/stories
// @access  Private
const getUserStories = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Fetching stories for user ${userId}`);

    // Fetch stories created by the user
    const userCreatedStories = await Story.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      attributes: [
        'id', 'title', 'content', 'kanjiLevel', 'grammarLevel', 
        'length', 'topic', 'createdAt', 'upvoteCount'
      ]
    });
    
    console.log(`Found ${userCreatedStories.length} stories created by user ${userId}`);

    // Get completed stories
    const userCompletedStories = await UserReadStories.findAll({
      where: { userId },
      include: [{
        model: Story,
        attributes: [
          'id', 'title', 'content', 'kanjiLevel', 'grammarLevel', 
          'length', 'topic', 'createdAt', 'upvoteCount', 'userId'
        ]
      }]
    });

    // Get upvoted stories
    const userUpvotedStories = await UserUpvotedStories.findAll({
      where: { userId },
      attributes: ['storyId']
    });
    
    const upvotedStoryIds = userUpvotedStories.map(upvote => upvote.storyId);

    // Combine user stories and completed stories
    let allStories = [...userCreatedStories];
    
    // Add completed stories that aren't already in the list (user's own stories)
    userCompletedStories.forEach(completion => {
      if (completion.Story && !allStories.some(s => s.id === completion.Story.id)) {
        const story = completion.Story;
        // Convert to plain object for easier manipulation
        const storyObj = story.get({ plain: true });
        storyObj.completed = true;
        storyObj.completedAt = completion.completedAt;
        allStories.push(storyObj);
      } else if (completion.Story) {
        // Mark user's own story as completed
        const existingStory = allStories.find(s => s.id === completion.Story.id);
        if (existingStory) {
          existingStory.completed = true;
          existingStory.completedAt = completion.completedAt;
        }
      }
    });
    
    // Mark stories owned by the user
    allStories = allStories.map(story => {
      const storyObj = story.get ? story.get({ plain: true }) : story;
      return {
        ...storyObj,
        isOwner: storyObj.userId === userId,
        upvoted: upvotedStoryIds.includes(storyObj.id)
      };
    });

    console.log(`Returning ${allStories.length} total stories to user ${userId}`);
    res.json(allStories);
  } catch (error) {
    console.error('Error in getUserStories:', error);
    res.status(500).json({ message: 'Failed to fetch stories' });
  }
};

// @desc    Translate a story to English
// @route   POST /api/stories/:id/translate
// @access  Private
const translateStory = async (req, res) => {
  console.log('========== TRANSLATION REQUEST ==========');
  console.log(`Translation request for story ID: ${req.params.id}`);
  console.log(`User: ${req.user?.id} (${req.user?.username || 'unknown'})`);
  
  try {
    const story = await Story.findByPk(req.params.id);
    
    if (!story) {
      console.log(`ERROR: Story not found with ID: ${req.params.id}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Story not found' 
      });
    }
    
    console.log(`Found story: "${story.title}" (${story.content.length} chars)`);
    
    // Check if the story already has an English translation
    if (story.englishContent && story.englishContent.length > 10) {
      console.log(`Story already has translation (${story.englishContent.length} chars)`);
      return res.json({
        success: true,
        englishContent: story.englishContent
      });
    }
    
    // If we don't have a cached translation, generate one
    if (!story.englishContent) {
      try {
        const translationPrompt = `Please translate the following Japanese text to English. Maintain paragraph breaks and the original meaning:
${story.content}`;
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: translationPrompt }],
          max_tokens: 1500,
        });
        
        const englishContent = response.choices[0].message.content.trim();
        console.log(`Translation generated successfully (${englishContent.length} chars)`);
        console.log(`First 100 chars: ${englishContent.substring(0, 100)}...`);

        // Save the translation to the story
        await story.update({ englishContent });
        console.log(`Translation saved to story in database`);
        
        return res.json({
          success: true,
          englishContent
        });
      } catch (translationError) {
        console.error('Error generating translation:', translationError);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate translation',
          error: translationError.message
        });
      }
    }
  } catch (error) {
    console.error('Error in translateStory:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get community stories (public stories from other users)
// @route   GET /api/stories/community
// @access  Private
const getCommunityStories = async (req, res) => {
  try {
    console.log(`Getting community stories, requested by user: ${req.user.username}`);
    
    // Find stories the user has read
    const readStories = await req.app.get('sequelize').model('UserReadStories').findAll({
      where: { userId: req.user.id },
      attributes: ['storyId']
    });
    const readStoryIds = readStories.map(record => record.storyId);
    
    // Find stories the user has upvoted
    const upvotedStories = await req.app.get('sequelize').model('UserUpvotedStories').findAll({
      where: { userId: req.user.id },
      attributes: ['storyId']
    });
    const upvotedStoryIds = upvotedStories.map(record => record.storyId);
    
    // Query for public stories, excluding the user's own stories
    const publicStories = await Story.findAll({ 
      where: { 
        userId: { [Op.ne]: req.user.id } // Exclude user's own stories
      },
      order: [
        ['upvoteCount', 'DESC'], 
        ['createdAt', 'DESC']
      ],
      include: [{
        model: User,
        as: 'author',
        attributes: ['username']
      }],
      attributes: ['id', 'title', 'content', 'kanjiLevel', 'grammarLevel', 'length', 'topic', 'createdAt', 'upvoteCount', 'userId']
    });
    
    console.log(`Found ${publicStories.length} public stories from the community`);
    
    // Map the stories and add user-specific flags
    const communityStories = publicStories.map(story => {
      const storyObj = story.toJSON();
      return {
        ...storyObj,
        isOwner: false,
        hasUpvoted: upvotedStoryIds.includes(storyObj.id),
        completed: readStoryIds.includes(storyObj.id),
        username: storyObj.author?.username || 'Anonymous'
      };
    });
    
    return res.json(communityStories);
  } catch (error) {
    console.error('Error in getCommunityStories:', error);
    return res.status(500).json({ 
      message: 'Failed to get community stories',
      error: error.message
    });
  }
};

// @desc    Upvote a story
// @route   POST /api/stories/:id/upvote
// @access  Private
const upvoteStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user.id;
    
    console.log(`User ${req.user.username} is upvoting story ${storyId}`);
    
    // Find the story
    const story = await Story.findByPk(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }
    
    // Get the join table model
    const UserUpvotedStories = req.app.get('sequelize').model('UserUpvotedStories');
    
    // Check if user has already upvoted this story
    const upvote = await UserUpvotedStories.findOne({
      where: {
        userId,
        storyId
      }
    });
    
    let message;
    let hasUpvoted;
    
    if (upvote) {
      // User has already upvoted, so remove the upvote
      await upvote.destroy();
      
      // Decrease the upvote count
      await story.decrement('upvoteCount');
      await story.reload();
      
      message = 'Upvote removed';
      hasUpvoted = false;
      console.log(`User ${req.user.username} removed upvote from story ${storyId}`);
    } else {
      // User hasn't upvoted, so add the upvote
      await UserUpvotedStories.create({
        userId,
        storyId
      });
      
      // Increase the upvote count
      await story.increment('upvoteCount');
      await story.reload();
      
      message = 'Story upvoted';
      hasUpvoted = true;
      console.log(`User ${req.user.username} added upvote to story ${storyId}`);
    }
    
    return res.json({ 
      message, 
      upvoteCount: story.upvoteCount,
      hasUpvoted
    });
  } catch (error) {
    console.error('Error in upvoteStory:', error);
    return res.status(500).json({ 
      message: 'Failed to upvote story',
      error: error.message
    });
  }
};

// @desc    Toggle a story's visibility
// @route   PUT /api/stories/:id/toggle-visibility
// @access  Private
const toggleStoryVisibility = async (req, res) => {
  try {
    const story = await Story.findByPk(req.params.id);
    
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }
    
    // Check if the user is the owner of the story
    if (story.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to modify this story' });
    }
    
    // Always set to public
    await story.update({ isPublic: true });
    
    return res.json({
      message: 'Story is now public',
      isPublic: story.isPublic
    });
  } catch (error) {
    console.error('Error in toggleStoryVisibility:', error);
    return res.status(500).json({ 
      message: 'Failed to toggle story visibility',
      error: error.message
    });
  }
};

module.exports = {
  generateStory,
  getStoryById,
  markStoryAsComplete,
  getStoryReview,
  getUserStories,
  translateStory,
  getCommunityStories,
  upvoteStory,
  toggleStoryVisibility
}; 
