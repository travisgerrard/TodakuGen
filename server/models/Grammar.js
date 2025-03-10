const mongoose = require('mongoose');

const GrammarSchema = new mongoose.Schema({
  rule: {
    type: String,
    required: true,
    trim: true
  },
  genkiChapter: {
    type: Number,
    required: true
  },
  explanation: {
    type: String,
    required: true
  },
  examples: [
    {
      sentence: {
        type: String,
        required: true
      },
      translation: {
        type: String,
        required: true
      }
    }
  ],
  commonMistakes: {
    type: String,
    default: ''
  },
  similarPatterns: {
    type: String,
    default: ''
  },
  stories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story'
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('Grammar', GrammarSchema); 