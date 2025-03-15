const jwt = require('jsonwebtoken');
const { User, Story, Vocabulary, Grammar } = require('../models');

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
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({
      message: error.message
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Fetching user profile for userId: ${userId}`);

    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: Story,
          as: 'stories',
          required: false,
        },
        {
          model: Story,
          as: 'completedStories',
          through: { attributes: ['completedAt'] },
          required: false,
        },
        {
          model: Story,
          as: 'upvotedStories',
          through: { attributes: [] },
          required: false,
        },
        {
          model: Vocabulary,
          as: 'vocabulary',
          required: false,
        },
        {
          model: Grammar,
          as: 'grammar',
          required: false,
        }
      ]
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`Successfully fetched user profile for ${userId}`);
    
    // Return the user profile
    res.json({
      id: user.id,
      username: user.username,
      waniKaniLevel: user.waniKaniLevel,
      genkiChapter: user.genkiChapter,
      preferences: user.preferences,
      stories: user.stories || [],
      completedStories: user.completedStories || [],
      upvotedStories: user.upvotedStories || [],
      vocabulary: user.vocabulary || [],
      grammar: user.grammar || []
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
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