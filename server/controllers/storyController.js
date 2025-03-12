const { OpenAI } = require('openai');
const Story = require('../models/Story');
const User = require('../models/User');
const Vocabulary = require('../models/Vocabulary');
const Grammar = require('../models/Grammar');
const path = require('path');
const fs = require('fs');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY 
});

// Fallback stories for when OpenAI API fails
const fallbackStories = [
  {
    title: '公園で',
    content: `私は今日公園に行きました。空は青くて、天気はとても良かったです。

公園には多くの人がいました。子供たちは遊んでいて、大人たちは話をしていました。

私はベンチに座って、本を読みました。時々、鳥の声を聞きました。

二時間後、私は家に帰りました。今日は楽しかったです。`,
    englishContent: `At the Park

I went to the park today. The sky was blue, and the weather was very good.

There were many people in the park. Children were playing, and adults were talking.

I sat on a bench and read a book. Sometimes, I heard birds singing.

Two hours later, I went home. Today was fun.`,
    kanjiLevel: 2,
    grammarLevel: 1,
    length: 'short',
    topic: 'daily life'
  },
  {
    title: '新しい友達',
    content: `山田さんは日本語の学生です。彼は大学で勉強しています。

今日、山田さんは新しい友達に会いました。その友達の名前は田中さんです。田中さんもまた大学生です。

二人は一緒にコーヒーを飲みました。彼らは学校と趣味について話しました。山田さんは音楽が好きで、田中さんは映画が好きです。

今度の週末、彼らは映画館に行くつもりです。新しい友達ができて、山田さんはとても嬉しいです。`,
    englishContent: `New Friend

Yamada-san is a Japanese language student. He studies at university.

Today, Yamada-san met a new friend. That friend's name is Tanaka-san. Tanaka-san is also a university student.

They drank coffee together. They talked about school and hobbies. Yamada-san likes music, and Tanaka-san likes movies.

Next weekend, they plan to go to the movie theater. Yamada-san is very happy to have made a new friend.`,
    kanjiLevel: 3,
    grammarLevel: 2,
    length: 'medium',
    topic: 'school'
  }
];

// @desc    Generate a new story using ChatGPT
// @route   GET /api/stories/generate
// @access  Private
const generateStory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    console.log(`Generating story for user: ${user._id} (${user.username})`);
    
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
          const translationPrompt = `Please translate the following Japanese text to English:
          
${japaneseText}`;
          
          const translationResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: translationPrompt }],
            max_tokens: 1000,
          });
          
          englishContent = translationResponse.choices[0].message.content.trim();
        } catch (translationError) {
          console.error('Error getting translation:', translationError);
          englishContent = "Translation not available.";
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
      const story = new Story({
        title,
        content,
        englishContent,
        user: req.user._id,
        kanjiLevel: parseInt(waniKaniLevel, 10),
        grammarLevel: parseInt(genkiChapter, 10),
        length,
        topic,
        vocabulary: [], // This would be filled by analyzing the content
        grammarPoints: [], // This would be filled by analyzing the content
      });

      await story.save();
      console.log(`Story created with ID: ${story._id} for user: ${user.username}`);
      console.log(`English content saved: ${story.englishContent ? 'Yes' : 'No'} (${story.englishContent?.length || 0} chars)`);

      res.json({
        storyId: story._id,
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
      const story = new Story({
        title: fallbackStory.title,
        content: fallbackStory.content,
        englishContent: fallbackStory.englishContent,
        user: req.user._id,
        kanjiLevel: parseInt(waniKaniLevel, 10),
        grammarLevel: parseInt(genkiChapter, 10),
        length,
        topic,
        vocabulary: [],
        grammarPoints: [],
      });

      await story.save();
      console.log(`Fallback story created with ID: ${story._id} for user: ${user.username}`);

      res.json({
        storyId: story._id,
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
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      res.status(404);
      throw new Error('Story not found');
    }
    
    // Check if the user has upvoted this story
    let hasUpvoted = false;
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user && user.upvotedStories) {
        hasUpvoted = user.upvotedStories.some(id => id.toString() === story._id.toString());
      }
    }
    
    // Format response consistently with generateStory endpoint
    res.json({
      storyId: story._id,
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
    const user = await User.findById(req.user._id);
    const storyId = req.params.id;
    
    // Check if story exists
    const story = await Story.findById(storyId);
    if (!story) {
      res.status(404);
      throw new Error('Story not found');
    }
    
    // Add to user's readStories if not already there
    const alreadyRead = user.readStories.some(
      (s) => s.storyId.toString() === storyId
    );
    
    if (!alreadyRead) {
      user.readStories.push({
        storyId,
        completedAt: new Date()
      });
      await user.save();
    }
    
    res.json({ success: true, message: 'Story marked as completed' });
  } catch (error) {
    res.status(400).json({
      message: 'Failed to mark story as complete',
      error: error.message,
    });
  }
};

// @desc    Analyze story content for vocabulary and grammar
// @access  Private (internal function)
const analyzeStoryContent = async (story, user) => {
  try {
    if (!story || !story.content) {
      console.error('Invalid story provided for analysis');
      return null;
    }

    console.log(`Analyzing story content for ID: ${story._id}`);

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
    console.log(`Raw GPT-4o response for story ${story._id}:`);
    console.log(rawContent);
    
    // Create a file with the raw response for future reference
    const responseLogDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(responseLogDir)) {
      fs.mkdirSync(responseLogDir, { recursive: true });
    }
    const logFileName = path.join(responseLogDir, `story-analysis-${story._id}-${Date.now()}.json`);
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
    const story = await Story.findById(storyId);
    if (!story) {
      console.error(`Story not found with ID: ${storyId}`);
      return [];
    }

    // Clear existing vocabulary
    story.vocabulary = [];

    // Process and save each vocabulary item
    const savedItems = [];
    for (const item of vocabularyItems) {
      // Check if vocab already exists in database
      let vocabDoc = await Vocabulary.findOne({ 
        word: item.word,
        reading: item.reading
      });

      // If not found, create a new vocabulary entry
      if (!vocabDoc) {
        vocabDoc = new Vocabulary({
          word: item.word,
          reading: item.reading,
          meaning: item.meaning,
          kanjiLevel: story.kanjiLevel,
          exampleSentences: item.examples || [],
          notes: item.notes || ''
        });
        await vocabDoc.save();
      } else {
        // Update existing vocabulary with any new example sentences
        if (item.examples && item.examples.length > 0) {
          const existingExamples = vocabDoc.exampleSentences.map(ex => ex.sentence);
          
          for (const example of item.examples) {
            if (!existingExamples.includes(example.sentence)) {
              vocabDoc.exampleSentences.push(example);
            }
          }
          
          // Add notes if they exist and are new
          if (item.notes && (!vocabDoc.notes || vocabDoc.notes !== item.notes)) {
            vocabDoc.notes = item.notes;
          }
          
          await vocabDoc.save();
        }
      }

      // Add to story's vocabulary array
      story.vocabulary.push({
        wordId: vocabDoc._id,
        frequency: 1
      });

      // Add story reference to vocabulary document if not already there
      if (!vocabDoc.stories.includes(storyId)) {
        vocabDoc.stories.push(storyId);
        await vocabDoc.save();
      }

      savedItems.push(vocabDoc);
    }

    await story.save();
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
    const story = await Story.findById(storyId);
    if (!story) {
      console.error(`Story not found with ID: ${storyId}`);
      return [];
    }

    // Clear existing grammar points
    story.grammarPoints = [];

    // Process and save each grammar point
    const savedItems = [];
    for (const item of grammarPoints) {
      // Check if grammar point already exists in database
      let grammarDoc = await Grammar.findOne({ 
        rule: item.rule
      });

      // If not found, create a new grammar entry
      if (!grammarDoc) {
        grammarDoc = new Grammar({
          rule: item.rule,
          genkiChapter: story.grammarLevel,
          explanation: item.explanation,
          examples: item.examples || [],
          commonMistakes: item.commonMistakes || '',
          similarPatterns: item.similarPatterns || ''
        });
        await grammarDoc.save();
      } else {
        // Update existing grammar with any new information
        if (item.explanation && grammarDoc.explanation !== item.explanation) {
          grammarDoc.explanation = item.explanation;
        }
        
        if (item.examples && item.examples.length > 0) {
          const existingExamples = grammarDoc.examples.map(ex => ex.sentence);
          
          for (const example of item.examples) {
            if (!existingExamples.includes(example.sentence)) {
              grammarDoc.examples.push(example);
            }
          }
        }
        
        // Add other information if it exists and is new
        if (item.commonMistakes) {
          grammarDoc.commonMistakes = item.commonMistakes;
        }
        
        if (item.similarPatterns) {
          grammarDoc.similarPatterns = item.similarPatterns;
        }
        
        await grammarDoc.save();
      }

      // Add to story's grammar points array
      story.grammarPoints.push(grammarDoc._id);

      // Add story reference to grammar document if not already there
      if (!grammarDoc.stories.includes(storyId)) {
        grammarDoc.stories.push(storyId);
        await grammarDoc.save();
      }

      savedItems.push(grammarDoc);
    }

    await story.save();
    return savedItems;
  } catch (error) {
    console.error('Error saving grammar points to database:', error);
    return [];
  }
};

// @desc    Get grammar/vocab breakdown for a story
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
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      console.log(`Story with ID ${req.params.id} not found`);
      return res.status(404).json({
        message: 'Story not found',
      });
    }
    
    // Check if the story already has vocabulary and grammar points
    const hasVocabulary = story.vocabulary && story.vocabulary.length > 0;
    const hasGrammarPoints = story.grammarPoints && story.grammarPoints.length > 0;
    
    console.log(`Story ${req.params.id} status - hasVocabulary: ${hasVocabulary} (${story.vocabulary?.length || 0} items), hasGrammarPoints: ${hasGrammarPoints} (${story.grammarPoints?.length || 0} items)`);
    
    // If missing vocabulary or grammar points, analyze the story content
    if (!hasVocabulary || !hasGrammarPoints) {
      console.log(`Story ${req.params.id} needs analysis - vocab: ${hasVocabulary}, grammar: ${hasGrammarPoints}`);
      
      // Get user for context
      const user = await User.findById(req.user._id);
      if (!user) {
        console.error(`User with ID ${req.user._id} not found when trying to analyze story`);
        return res.status(404).json({
          message: 'User not found',
        });
      }
      
      // Analyze story content
      const analysis = await analyzeStoryContent(story, user);
      
      if (analysis) {
        console.log(`Analysis complete for story ${req.params.id} - received vocabulary: ${analysis.vocabulary?.length || 0}, grammar: ${analysis.grammarPoints?.length || 0}`);
        
        // Save vocabulary and grammar points to database
        if (!hasVocabulary && analysis.vocabulary) {
          console.log(`Saving ${analysis.vocabulary.length} vocabulary items to database for story ${req.params.id}`);
          const savedVocab = await saveVocabularyToDatabase(analysis.vocabulary, story._id);
          console.log(`Saved ${savedVocab.length} vocabulary items successfully`);
        }
        
        if (!hasGrammarPoints && analysis.grammarPoints) {
          console.log(`Saving ${analysis.grammarPoints.length} grammar points to database for story ${req.params.id}`);
          const savedGrammar = await saveGrammarToDatabase(analysis.grammarPoints, story._id);
          console.log(`Saved ${savedGrammar.length} grammar points successfully`);
        }
      } else {
        console.log(`No analysis results returned for story ${req.params.id}`);
      }
    }
    
    // Always reload the story with populated data to ensure we have the latest
    const populatedStory = await Story.findById(req.params.id)
      .populate('vocabulary.wordId')
      .populate('grammarPoints');
      
    if (!populatedStory) {
      console.error(`Failed to reload story ${req.params.id} after analysis`);
      return res.status(500).json({
        message: 'Error retrieving story data after analysis',
      });
    }
    
    // Transform the data for API response
    const vocabularyItems = populatedStory.vocabulary || [];
    const grammarPoints = populatedStory.grammarPoints || [];
    
    console.log(`Transformed data for response - vocabulary: ${vocabularyItems.length}, grammar: ${grammarPoints.length}`);
    
    // Check if we have valid nested data
    const validVocab = vocabularyItems.filter(item => item && item.wordId);
    const validGrammar = grammarPoints.filter(item => item);
    
    if (validVocab.length !== vocabularyItems.length) {
      console.warn(`Some vocabulary items (${vocabularyItems.length - validVocab.length}) are invalid or missing wordId reference`);
    }
    
    if (validGrammar.length !== grammarPoints.length) {
      console.warn(`Some grammar points (${grammarPoints.length - validGrammar.length}) are invalid`);
    }
    
    // Return valid data
    const response = {
      vocabulary: validVocab,
      grammarPoints: validGrammar,
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

// @desc    Get all user stories
// @route   GET /api/stories
// @access  Private
const getUserStories = async (req, res) => {
  try {
    console.log(`Getting stories for user: ${req.user._id} (${req.user.username})`);
    
    // Find all stories associated with this user
    const user = await User.findById(req.user._id)
      .populate({
        path: 'readStories.storyId',
        select: 'title content kanjiLevel grammarLevel length topic createdAt'
      });
    
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get all stories created by this user
    const userStories = await Story.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('title content kanjiLevel grammarLevel length topic createdAt upvoteCount');
      
    console.log(`Found ${userStories.length} stories created by user: ${req.user.username}`);
    
    // Get completed stories from user.readStories
    const completedStories = user.readStories
      .filter(item => item.storyId)
      .map(item => {
        const storyData = item.storyId.toObject();
        return {
          ...storyData,
          completed: true,
          completedAt: item.completedAt
        };
      });
      
    console.log(`Found ${completedStories.length} completed stories for user: ${req.user.username}`);
    
    // Combine all stories, mark which ones are completed, and sort by date
    // Create a map of story IDs to avoid duplicates
    const storyMap = new Map();
    
    // Add user created stories to the map
    userStories.forEach(story => {
      const storyObj = story.toObject();
      storyMap.set(storyObj._id.toString(), {
        ...storyObj,
        completed: false,
        isOwner: true, // Mark that user owns this story
        storyId: storyObj._id,
        isPublic: true // All stories are public
      });
    });
    
    // Check read stories - add any that aren't already in the map
    completedStories.forEach(story => {
      const storyId = story._id.toString();
      if (storyMap.has(storyId)) {
        // Update existing entry to mark as completed
        const existingStory = storyMap.get(storyId);
        storyMap.set(storyId, {
          ...existingStory,
          completed: true,
          completedAt: story.completedAt
        });
      } else {
        // Add new entry
        storyMap.set(storyId, {
          ...story,
          isOwner: false,
          storyId: story._id
        });
      }
    });
    
    // Check if user has upvoted any stories
    if (user.upvotedStories && user.upvotedStories.length > 0) {
      // Convert user's upvoted stories to a set for quick lookup
      const upvotedStoryIds = new Set(
        user.upvotedStories.map(id => id.toString())
      );
      
      // Update hasUpvoted for each story in the map
      for (const [storyId, storyData] of storyMap.entries()) {
        storyMap.set(storyId, {
          ...storyData,
          hasUpvoted: upvotedStoryIds.has(storyId)
        });
      }
    }
    
    // Convert map to array for response
    const allStories = Array.from(storyMap.values());
    
    console.log(`Returning ${allStories.length} total stories for user: ${req.user.username}`);
    
    res.json(allStories);
  } catch (error) {
    console.error('Error in getUserStories:', error);
    res.status(500).json({
      message: 'Failed to retrieve stories',
      error: error.message
    });
  }
};

// @desc    Translate a story to English if it doesn't have a translation
// @route   POST /api/stories/:id/translate
// @access  Private
const translateStory = async (req, res) => {
  console.log('========== TRANSLATION REQUEST ==========');
  console.log(`Translation request for story ID: ${req.params.id}`);
  console.log(`User: ${req.user?._id} (${req.user?.name || 'unknown'})`);
  
  try {
    const story = await Story.findById(req.params.id);
    
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
    
    // Request a translation from OpenAI
    console.log(`Generating English translation using OpenAI API`);
    try {
      const translationPrompt = `Translate the following Japanese text to natural English. Create a high-quality, accurate translation that captures the meaning while sounding natural in English:
      
${story.content}`;
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: translationPrompt }],
        max_tokens: 2000,
        temperature: 0.3,
      });
      
      const englishContent = response.choices[0].message.content.trim();
      console.log(`Translation generated successfully (${englishContent.length} chars)`);
      console.log(`First 100 chars: ${englishContent.substring(0, 100)}...`);
      
      // Save the translation to the story
      story.englishContent = englishContent;
      await story.save();
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
  } catch (error) {
    console.error('Error in translateStory:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get community stories (all public stories)
// @route   GET /api/stories/community
// @access  Private
const getCommunityStories = async (req, res) => {
  try {
    console.log(`Getting community stories, requested by user: ${req.user.username}`);
    
    // Find the user to get their upvoted and read stories
    const user = await User.findById(req.user._id)
      .populate({
        path: 'readStories.storyId',
        select: '_id'
      })
      .populate({
        path: 'upvotedStories',
        select: '_id'
      });
    
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get IDs of stories the user has upvoted and read
    const upvotedStoryIds = user.upvotedStories.map(story => story._id.toString());
    const readStoryIds = user.readStories
      .filter(item => item.storyId)
      .map(item => item.storyId._id.toString());
    
    // Query for public stories, excluding the user's own stories
    const publicStories = await Story.find({ 
      isPublic: true, 
      user: { $ne: req.user._id } // Exclude user's own stories
    })
    .sort({ upvoteCount: -1, createdAt: -1 }) // Sort by upvotes (desc) then creation date (desc)
    .populate({
      path: 'user',
      select: 'username'
    })
    .select('title content kanjiLevel grammarLevel length topic createdAt upvoteCount user');
    
    console.log(`Found ${publicStories.length} public stories from the community`);
    
    // Map the stories and add user-specific flags
    const communityStories = publicStories.map(story => {
      const storyObj = story.toObject();
      return {
        ...storyObj,
        isOwner: false,
        hasUpvoted: upvotedStoryIds.includes(storyObj._id.toString()),
        completed: readStoryIds.includes(storyObj._id.toString()),
        username: storyObj.user?.username || 'Anonymous'
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
    const userId = req.user._id;
    
    console.log(`User ${req.user.username} is upvoting story ${storyId}`);
    
    // Find the story
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }
    
    // Removed the restriction for upvoting own stories
    // Users can now upvote their own stories
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has already upvoted this story
    const alreadyUpvoted = story.upvotes.some(upvoteId => upvoteId.toString() === userId.toString());
    const userUpvotedIndex = user.upvotedStories.findIndex(id => id.toString() === storyId);
    
    let message;
    
    if (alreadyUpvoted) {
      // User has already upvoted, so remove the upvote
      story.upvotes = story.upvotes.filter(id => id.toString() !== userId.toString());
      story.upvoteCount = Math.max(0, story.upvoteCount - 1);
      
      // Remove from user's upvoted stories
      if (userUpvotedIndex !== -1) {
        user.upvotedStories.splice(userUpvotedIndex, 1);
      }
      
      message = 'Upvote removed';
      console.log(`User ${req.user.username} removed upvote from story ${storyId}`);
    } else {
      // User hasn't upvoted, so add the upvote
      story.upvotes.push(userId);
      story.upvoteCount += 1;
      
      // Add to user's upvoted stories
      if (userUpvotedIndex === -1) {
        user.upvotedStories.push(storyId);
      }
      
      message = 'Story upvoted';
      console.log(`User ${req.user.username} added upvote to story ${storyId}`);
    }
    
    // Save both story and user
    await Promise.all([story.save(), user.save()]);
    
    return res.json({ 
      message, 
      upvoteCount: story.upvoteCount,
      hasUpvoted: !alreadyUpvoted
    });
  } catch (error) {
    console.error('Error in upvoteStory:', error);
    return res.status(500).json({ 
      message: 'Failed to upvote story',
      error: error.message
    });
  }
};

// @desc    Toggle a story's public/private visibility
// @route   PUT /api/stories/:id/toggle-visibility
// @access  Private
const toggleStoryVisibility = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }
    
    // Check if the user is the owner of the story
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this story' });
    }
    
    // Always set to public
    story.isPublic = true;
    await story.save();
    
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
