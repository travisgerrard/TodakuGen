const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  waniKaniLevel: {
    type: Number,
    default: 1
  },
  genkiChapter: {
    type: Number,
    default: 0
  },
  preferences: {
    storyLength: {
      type: String,
      enum: ['short', 'medium', 'long'],
      default: 'medium'
    },
    maxKanjiLevel: {
      type: Number,
      default: 5
    },
    maxGrammarLevel: {
      type: Number,
      default: 3
    },
    topics: {
      type: [String],
      default: ['daily life', 'school', 'travel']
    }
  },
  difficultWords: [
    {
      wordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vocabulary'
      },
      sleepUntil: {
        type: Date,
        default: Date.now
      }
    }
  ],
  readStories: [
    {
      storyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Story'
      },
      completedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema); 