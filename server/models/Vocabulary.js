const mongoose = require('mongoose');

const VocabularySchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
    trim: true
  },
  reading: {
    type: String,
    required: true,
    trim: true
  },
  meaning: {
    type: String,
    required: true,
    trim: true
  },
  kanjiLevel: {
    type: Number,
    required: true
  },
  exampleSentences: [
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
  notes: {
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

module.exports = mongoose.model('Vocabulary', VocabularySchema); 