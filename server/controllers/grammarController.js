const { Grammar, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Search grammar database
// @route   GET /api/grammar/search
// @access  Private
const searchGrammar = async (req, res) => {
  try {
    const { query, genkiChapter } = req.query;
    
    // Build search filter
    const where = {};
    
    if (query) {
      where[Op.or] = [
        { rule: { [Op.iLike]: `%${query}%` } },
        { explanation: { [Op.iLike]: `%${query}%` } }
      ];
    }
    
    let level = null;
    if (genkiChapter) {
      level = parseInt(genkiChapter);
    } else if (req.user) {
      // Default to user's level if not specified
      const user = await User.findByPk(req.user.id);
      if (user && user.genkiChapter) {
        level = user.genkiChapter;
      }
    }
    
    if (level) {
      where.genkiChapter = { [Op.lte]: level };
    }
    
    const grammar = await Grammar.findAll({
      where,
      limit: 20
    });
    
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
    const grammarPoints = await Grammar.findAll({
      limit: 100
    });
    
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