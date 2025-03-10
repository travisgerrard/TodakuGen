const express = require('express');
const router = express.Router();
const {
  generateStory,
  getStoryById,
  getStories,
  markStoryAsComplete,
  getStoryReview,
  getUserStories,
  translateStory
} = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');

// Story management routes
router.get('/generate', protect, generateStory);
router.get('/:id', protect, getStoryById);
router.post('/:id/complete', protect, markStoryAsComplete);
router.get('/:id/review', protect, getStoryReview);

// Translation route - ensuring it's properly defined
router.post('/:id/translate', protect, translateStory);

router.get('/', protect, getUserStories);

module.exports = router; 