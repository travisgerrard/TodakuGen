const express = require('express');
const router = express.Router();
const {
  generateStory,
  getStoryById,
  markStoryAsComplete,
  getStoryReview,
  getUserStories,
  translateStory,
  getCommunityStories,
  upvoteStory,
  toggleStoryVisibility
} = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');

// Story management routes
router.get('/generate', protect, generateStory);

// Community stories route - place before /:id to ensure it's matched
router.get('/community', protect, getCommunityStories);

// Individual story routes
router.get('/:id', protect, getStoryById);
router.post('/:id/complete', protect, markStoryAsComplete);
router.get('/:id/review', protect, getStoryReview);
router.post('/:id/translate', protect, translateStory);
router.post('/:id/upvote', protect, upvoteStory);
router.put('/:id/toggle-visibility', protect, toggleStoryVisibility);

// Get user stories - this is the root route
router.get('/', protect, getUserStories);

module.exports = router; 