const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  waniKaniLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  genkiChapter: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      storyLength: 'medium',
      maxKanjiLevel: 5,
      maxGrammarLevel: 3,
      topics: ['daily life', 'school', 'travel']
    }
  }
}, {
  timestamps: true,
});

// Setup model associations function (called after all models are defined)
const setupAssociations = (models) => {
  const { Story, Vocabulary } = models;

  // User has many Stories
  User.hasMany(Story, {
    foreignKey: 'userId',
    as: 'stories'
  });

  // Define difficult words relationship
  User.belongsToMany(Vocabulary, {
    through: models.UserDifficultWords,
    foreignKey: 'userId',
    otherKey: 'vocabularyId',
    as: 'difficultWords'
  });

  // Define read stories relationship
  User.belongsToMany(Story, {
    through: models.UserReadStories,
    foreignKey: 'userId',
    otherKey: 'storyId',
    as: 'readStories'
  });

  // Define upvoted stories relationship
  User.belongsToMany(Story, {
    through: models.UserUpvotedStories,
    foreignKey: 'userId',
    otherKey: 'storyId',
    as: 'upvotedStories'
  });
};

module.exports = { User, setupAssociations }; 