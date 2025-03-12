const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
    const userExists = await User.findOne({ username });

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
        userId: user._id,
        username: user.username,
        token: generateToken(user._id),
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

// @desc    Login user (simplified, username only)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { username } = req.body;

    // Check if user exists, create if not (simplified auth)
    let user = await User.findOne({ username });

    if (!user) {
      // Create new user if username doesn't exist
      console.log(`User '${username}' not found, creating new account`);
      user = await User.create({
        username
      });
    } else {
      console.log(`User '${username}' found, logging in existing account (ID: ${user._id})`);
    }

    // Return comprehensive user data
    res.json({
      userId: user._id,
      username: user.username,
      token: generateToken(user._id),
      waniKaniLevel: user.waniKaniLevel,
      genkiChapter: user.genkiChapter,
      preferences: user.preferences,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({
      message: error.message
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      console.error('getUserProfile called without valid user ID');
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    console.log(`Fetching profile for user: ${req.user._id}`);
    const user = await User.findById(req.user._id);

    if (user) {
      // Return comprehensive user data
      res.json({
        _id: user._id,
        username: user.username,
        waniKaniLevel: user.waniKaniLevel,
        genkiChapter: user.genkiChapter,
        preferences: user.preferences,
        storyCount: user.readStories?.length || 0,
      });
    } else {
      console.error(`User not found with ID: ${req.user._id}`);
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('getUserProfile error:', error);
    res.status(400).json({
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/me
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.waniKaniLevel = req.body.waniKaniLevel || user.waniKaniLevel;
      user.genkiChapter = req.body.genkiChapter || user.genkiChapter;
      
      if (req.body.preferences) {
        user.preferences = {
          ...user.preferences,
          ...req.body.preferences,
        };
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        waniKaniLevel: updatedUser.waniKaniLevel,
        genkiChapter: updatedUser.genkiChapter,
        preferences: updatedUser.preferences,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
}; 