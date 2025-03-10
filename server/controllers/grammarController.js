const Grammar = require('../models/Grammar');
const User = require('../models/User');

// @desc    Search grammar database
// @route   GET /api/grammar/search
// @access  Private
const searchGrammar = async (req, res) => {
  try {
    const { query, genkiChapter } = req.query;
    
    // Build search filter
    const filter = {};
    
    if (query) {
      filter.$or = [
        { rule: { $regex: query, $options: 'i' } },
        { pattern: { $regex: query, $options: 'i' } },
        { explanation: { $regex: query, $options: 'i' } },
      ];
    }
    
    if (genkiChapter) {
      filter.genkiChapter = { $lte: parseInt(genkiChapter) };
    } else if (req.user) {
      // Default to user's level if not specified
      const user = await User.findById(req.user._id);
      if (user && user.genkiChapter) {
        filter.genkiChapter = { $lte: user.genkiChapter };
      }
    }
    
    const grammar = await Grammar.find(filter).limit(20);
    
    res.json(grammar);
  } catch (error) {
    res.status(400).json({
      message: 'Failed to search grammar',
      error: error.message,
    });
  }
};

// @desc    Get all grammar points in the database
// @route   GET /api/grammar/all
// @access  Private
const getAllGrammar = async (req, res) => {
  try {
    // Limit to 100 results to avoid performance issues
    const grammarPoints = await Grammar.find().limit(100);
    
    res.json(grammarPoints);
  } catch (error) {
    console.error('Error fetching all grammar points:', error);
    res.status(500).json({
      message: 'Failed to retrieve grammar points',
      error: error.message,
    });
  }
};

module.exports = {
  searchGrammar,
  getAllGrammar,
}; 