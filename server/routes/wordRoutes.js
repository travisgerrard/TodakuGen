const express = require('express');
const router = express.Router();
const {
  markWordAsDifficult,
  getDifficultWords,
  getWordsForReview,
  searchVocabulary,
  getAllVocabulary,
  removeFromDifficult,
} = require('../controllers/wordController');
const { protect } = require('../middleware/authMiddleware');

// Word management routes
router.post('/mark', protect, markWordAsDifficult);
router.delete('/difficult/:wordId', protect, removeFromDifficult);
router.get('/difficult', protect, getDifficultWords);
router.get('/review', protect, getWordsForReview);

// Vocabulary database browsing
router.get('/', protect, searchVocabulary);
router.get('/all', protect, getAllVocabulary);
router.get('/search', protect, searchVocabulary);

module.exports = router; 