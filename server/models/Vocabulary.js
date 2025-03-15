const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Vocabulary = sequelize.define('Vocabulary', {
  word: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  reading: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  meaning: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  kanjiLevel: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  exampleSentences: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  timestamps: true
});

// Setup model associations function (called after all models are defined)
const setupAssociations = (models) => {
  const { Story, User } = models;

  // Vocabulary appears in many stories
  Vocabulary.belongsToMany(Story, {
    through: 'StoryVocabulary',
    foreignKey: 'vocabularyId',
    otherKey: 'storyId',
    as: 'stories'
  });

  // Vocabulary marked as difficult by users
  Vocabulary.belongsToMany(User, {
    through: 'UserDifficultWords',
    foreignKey: 'vocabularyId',
    otherKey: 'userId',
    as: 'markedDifficultBy'
  });
};

module.exports = { Vocabulary, setupAssociations }; 