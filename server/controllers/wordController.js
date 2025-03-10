const User = require('../models/User');
const Vocabulary = require('../models/Vocabulary');

// @desc    Mark a word as "too hard" (add to difficultWords)
// @route   POST /api/words/mark
// @access  Private
const markWordAsDifficult = async (req, res) => {
  try {
    const { wordId, sleepDays = 7 } = req.body;
    
    if (!wordId) {
      res.status(400);
      throw new Error('Word ID is required');
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    // Check if word exists
    const word = await Vocabulary.findById(wordId);
    if (!word) {
      res.status(404);
      throw new Error('Word not found');
    }
    
    // Remove if already in difficultWords (to avoid duplicates)
    user.difficultWords = user.difficultWords.filter(
      (w) => w.wordId.toString() !== wordId
    );
    
    // Calculate the date when this word should be shown again
    const sleepUntil = new Date();
    sleepUntil.setDate(sleepUntil.getDate() + sleepDays);
    
    // Add to difficultWords
    user.difficultWords.push({
      wordId,
      sleepUntil,
    });
    
    await user.save();
    
    res.json({ success: true, message: 'Word marked as difficult' });
  } catch (error) {
    res.status(400).json({
      message: 'Failed to mark word as difficult',
      error: error.message,
    });
  }
};

// @desc    Get difficult words
// @route   GET /api/words/difficult
// @access  Private
const getDifficultWords = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    console.log(`Fetching difficult words for user: ${req.user._id}`);
    const user = await User.findById(req.user._id)
      .populate('difficultWords.wordId');
    
    if (!user) {
      console.log(`User not found: ${req.user._id}`);
      return res.status(404).json({
        message: 'User not found',
      });
    }
    
    // Filter out entries without a valid wordId
    const allDifficultWords = user.difficultWords.filter(w => w.wordId);
    
    // Mark words as active or sleeping
    const now = new Date();
    const processedWords = allDifficultWords.map(word => {
      const isActive = word.sleepUntil <= now;
      return {
        ...word.toObject(),
        active: isActive,
        sleepRemaining: isActive ? 0 : Math.ceil((word.sleepUntil - now) / (1000 * 60 * 60 * 24)) // days remaining
      };
    });
    
    console.log(`Returning ${processedWords.length} difficult words (${processedWords.filter(w => w.active).length} active)`);
    return res.json(processedWords);
  } catch (error) {
    console.error('Error in getDifficultWords:', error);
    return res.status(500).json({
      message: 'Failed to get difficult words',
      error: error.message,
    });
  }
};

// @desc    Get words for review
// @route   GET /api/words/review
// @access  Private
const getWordsForReview = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    console.log(`Fetching review words for user: ${req.user._id}`);
    const user = await User.findById(req.user._id);
    
    if (!user) {
      console.log(`User not found: ${req.user._id}`);
      return res.status(404).json({
        message: 'User not found',
      });
    }
    
    // In a real app, this would retrieve recently encountered words
    // based on stories the user has read
    
    // For now, let's fetch some words at the user's level as a demo
    const kanjiLevel = user.waniKaniLevel || 1;
    console.log(`Fetching words for WaniKani level: ${kanjiLevel}`);
    
    const wordsForReview = await Vocabulary.find({
      kanjiLevel: { $lte: kanjiLevel }
    }).limit(10);
    
    console.log(`Returning ${wordsForReview.length} words for review`);
    return res.json(wordsForReview || []);
  } catch (error) {
    console.error('Error in getWordsForReview:', error);
    return res.status(500).json({
      message: 'Failed to get words for review',
      error: error.message,
    });
  }
};

// @desc    Search vocabulary database
// @route   GET /api/vocabulary
// @access  Private
const searchVocabulary = async (req, res) => {
  try {
    const { query, kanjiLevel, addIfNotFound } = req.query;
    
    console.log(`Searching vocabulary: query="${query || ''}", kanjiLevel=${kanjiLevel || 'none'}`);
    
    // Build search filter
    const filter = {};
    
    if (query) {
      filter.$or = [
        { word: { $regex: query, $options: 'i' } },
        { reading: { $regex: query, $options: 'i' } },
        { meaning: { $regex: query, $options: 'i' } },
      ];
    }
    
    if (kanjiLevel) {
      filter.kanjiLevel = { $lte: parseInt(kanjiLevel) };
    } else if (req.user) {
      // Default to user's level if not specified
      const user = await User.findById(req.user._id);
      if (user && user.kanjiLevel) {
        filter.kanjiLevel = { $lte: user.kanjiLevel };
      }
    }
    
    const words = await Vocabulary.find(filter).limit(10);
    
    console.log(`Search returned ${words.length} results`);
    
    // If no words found and addIfNotFound is true, add the word
    if (words.length === 0 && addIfNotFound === 'true' && query) {
      console.log(`No words found for "${query}", adding to vocabulary database`);
      const newWord = await addWordToVocabulary(query, req.user);
      
      if (newWord) {
        console.log(`Added new word: ${newWord.word || newWord.reading}`);
        return res.json([newWord]);
      }
    }
    
    res.json(words);
  } catch (error) {
    console.error(`Search error: ${error.message}`);
    res.status(400).json({
      message: 'Search failed',
      error: error.message,
    });
  }
};

// @desc    Add a new word to vocabulary
// @access  Private (internal function)
const addWordToVocabulary = async (word, user) => {
  try {
    // Simple validation
    if (!word || typeof word !== 'string') {
      console.error('Invalid word provided to addWordToVocabulary');
      return null;
    }

    // Default values for a new word
    const newWordData = {
      word: word,
      reading: word, // Default to same as word for now
      meaning: 'Custom word', // Default meaning
      kanjiLevel: user && user.kanjiLevel ? user.kanjiLevel : 5, // Default to user's level or N5
      frequency: 0,
      exampleSentences: []
    };

    // Create and save the new word
    const newWord = new Vocabulary(newWordData);
    await newWord.save();
    
    console.log(`New word added to vocabulary: ${word}`);
    return newWord;
  } catch (error) {
    console.error(`Error adding word to vocabulary: ${error.message}`);
    return null;
  }
};

// @desc    Get all vocabulary words in the database
// @route   GET /api/words/all
// @access  Private
const getAllVocabulary = async (req, res) => {
  try {
    // Limit to 100 results to avoid performance issues
    const words = await Vocabulary.find().limit(100);
    
    res.json(words);
  } catch (error) {
    console.error('Error fetching all vocabulary:', error);
    res.status(500).json({
      message: 'Failed to retrieve vocabulary',
      error: error.message,
    });
  }
};

// @desc    Remove a word from the difficult list
// @route   DELETE /api/vocab/difficult/:wordId
// @access  Private
const removeFromDifficult = async (req, res) => {
  try {
    const { wordId } = req.params;
    
    if (!wordId) {
      res.status(400);
      throw new Error('Word ID is required');
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    // Find the index of the word in the difficultWords array
    const wordIndex = user.difficultWords.findIndex(
      item => item.wordId.toString() === wordId
    );
    
    if (wordIndex === -1) {
      res.status(404);
      throw new Error('Word not found in difficult list');
    }
    
    // Remove the word from the difficultWords array
    user.difficultWords.splice(wordIndex, 1);
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Word removed from difficult list'
    });
  } catch (error) {
    console.error('Error removing word from difficult list:', error);
    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to remove word from difficult list',
    });
  }
};

module.exports = {
  markWordAsDifficult,
  getDifficultWords,
  getWordsForReview,
  searchVocabulary,
  getAllVocabulary,
  removeFromDifficult,
}; 