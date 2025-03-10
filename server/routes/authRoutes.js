const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// User routes - protected
router.get('/me', protect, getUserProfile);
router.put('/me', protect, updateUserProfile);

module.exports = router; 