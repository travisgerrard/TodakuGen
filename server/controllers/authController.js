const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (simplified, username only)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { username } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ 
      where: { username }
    });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Create user with default values
    const user = await User.create({
      username
    });

    if (user) {
      res.status(201).json({
        userId: user.id,
        username: user.username,
        token: generateToken(user.id),
        waniKaniLevel: user.waniKaniLevel,
        genkiChapter: user.genkiChapter,
        preferences: user.preferences,
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { username } = req.body;

    // Validate input
    if (!username) {
      res.status(400);
      throw new Error('Please provide a username');
    }

    // Find the user
    const user = await User.findOne({
      where: { username }
    });

    if (!user) {
      // If user doesn't exist, create a new account
      return registerUser(req, res);
    }

    // User exists, generate token and return user data
    res.json({
      userId: user.id,
      username: user.username,
      token: generateToken(user.id),
      waniKaniLevel: user.waniKaniLevel,
      genkiChapter: user.genkiChapter,
      preferences: user.preferences,
      // Add a message about migration to inform users
      message: "Database migration in progress. Some user data may be temporarily unavailable."
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({
      message: error.message
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    // During migration, try a simple query first without associations
    // This is more likely to succeed during the transition period
    const user = await User.findByPk(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Return basic user info without trying to load associations that might not exist yet
    res.json({
      id: user.id,
      username: user.username,
      waniKaniLevel: user.waniKaniLevel,
      genkiChapter: user.genkiChapter,
      preferences: user.preferences,
      difficultWords: [], // Empty arrays for now
      readStories: [],
      upvotedStories: [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(400).json({
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Update fields if provided in the request
    if (req.body.username) user.username = req.body.username;
    if (req.body.waniKaniLevel) user.waniKaniLevel = req.body.waniKaniLevel;
    if (req.body.genkiChapter) user.genkiChapter = req.body.genkiChapter;

    // Handle preferences updates
    if (req.body.preferences) {
      // Merge with existing preferences
      user.preferences = {
        ...user.preferences,
        ...req.body.preferences
      };
    }

    await user.save();

    res.json({
      id: user.id,
      username: user.username,
      waniKaniLevel: user.waniKaniLevel,
      genkiChapter: user.genkiChapter,
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({
      message: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile
}; 