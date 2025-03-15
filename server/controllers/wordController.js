const { User, Vocabulary } = require('../models');
const { Op } = require('sequelize');

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
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    // Check if word exists
    const word = await Vocabulary.findByPk(wordId);
    if (!word) {
      res.status(404);
      throw new Error('Word not found');
    }
    
    // Calculate the date when this word should be shown again
    const sleepUntil = new Date();
    sleepUntil.setDate(sleepUntil.getDate() + sleepDays);
    
    // Get the join table model
    const UserDifficultWords = req.app.get('sequelize').model('UserDifficultWords');
    
    // Remove if already exists (to update with new sleep date)
    await UserDifficultWords.destroy({ 
      where: { 
        userId: user.id,
        vocabularyId: wordId
      }
    });
    
    // Add to difficultWords
    await UserDifficultWords.create({
      userId: user.id,
      vocabularyId: wordId,
      sleepUntil
    });
    
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
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    console.log(`Fetching difficult words for user: ${req.user.id}`);
    
    // Find user with difficult words
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Vocabulary,
        as: 'difficultWords',
        through: { attributes: ['sleepUntil'] }
      }]
    });
    
    if (!user) {
      console.log(`User not found: ${req.user.id}`);
      return res.status(404).json({
        message: 'User not found',
      });
    }
    
    // Process difficult words to add active/sleeping status
    const now = new Date();
    const processedWords = user.difficultWords.map(word => {
      const sleepUntil = word.UserDifficultWords.sleepUntil;
      const isActive = sleepUntil <= now;
      
      const wordObj = word.toJSON();
      
      return {
        ...wordObj,
        sleepUntil,
        active: isActive,
        sleepRemaining: isActive ? 0 : Math.ceil((sleepUntil - now) / (1000 * 60 * 60 * 24)) // days remaining
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
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    console.log(`Fetching review words for user: ${req.user.id}`);
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      console.log(`User not found: ${req.user.id}`);
      return res.status(404).json({
        message: 'User not found',
      });
    }
    
    // In a real app, this would retrieve recently encountered words
    // based on stories the user has read
    
    // For now, let's fetch some words at the user's level as a demo
    const kanjiLevel = user.waniKaniLevel || 1;
    console.log(`Fetching words for WaniKani level: ${kanjiLevel}`);
    
    const wordsForReview = await Vocabulary.findAll({
      where: {
        kanjiLevel: {
          [Op.lte]: kanjiLevel
        }
      },
      limit: 10
    });
    
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
    const where = {};
    
    if (query) {
      where[Op.or] = [
        { word: { [Op.iLike]: `%${query}%` } },
        { reading: { [Op.iLike]: `%${query}%` } },
        { meaning: { [Op.iLike]: `%${query}%` } }
      ];
    }
    
    let level = null;
    if (kanjiLevel) {
      level = parseInt(kanjiLevel);
    } else if (req.user) {
      // Default to user's level if not specified
      const user = await User.findByPk(req.user.id);
      if (user && user.waniKaniLevel) {
        level = user.waniKaniLevel;
      }
    }
    
    if (level) {
      where.kanjiLevel = { [Op.lte]: level };
    }
    
    const words = await Vocabulary.findAll({
      where,
      limit: 10
    });
    
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
      kanjiLevel: user && user.waniKaniLevel ? user.waniKaniLevel : 5, // Default to user's level or N5
      exampleSentences: []
    };

    // Create and save the new word
    const newWord = await Vocabulary.create(newWordData);
    
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
    const words = await Vocabulary.findAll({
      limit: 100
    });
    
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
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    // Get the join table model
    const UserDifficultWords = req.app.get('sequelize').model('UserDifficultWords');
    
    // Delete the relationship
    const deleted = await UserDifficultWords.destroy({
      where: {
        userId: user.id,
        vocabularyId: wordId
      }
    });
    
    if (deleted === 0) {
      res.status(404);
      throw new Error('Word not found in difficult list');
    }
    
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