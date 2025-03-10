const express = require('express');
const router = express.Router();
const { searchGrammar, getAllGrammar } = require('../controllers/grammarController');
const { protect } = require('../middleware/authMiddleware');

// Grammar database browsing
router.get('/search', protect, searchGrammar);
router.get('/all', protect, getAllGrammar);

module.exports = router; 