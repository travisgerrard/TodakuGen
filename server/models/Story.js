const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  englishContent: {
    type: String,
    default: ''
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  kanjiLevel: {
    type: Number,
    required: true
  },
  grammarLevel: {
    type: Number,
    required: true
  },
  length: {
    type: String,
    enum: ['short', 'medium', 'long'],
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  vocabulary: [
    {
      wordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vocabulary'
      },
      frequency: {
        type: Number,
        default: 1
      }
    }
  ],
  grammarPoints: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grammar'
    }
  ],
  audioUrl: {
    type: String,
    default: null
  },
  upvotes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  upvoteCount: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Story', StorySchema); 