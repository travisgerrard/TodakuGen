const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Story = sequelize.define('Story', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  englishContent: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  kanjiLevel: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  grammarLevel: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  length: {
    type: DataTypes.ENUM('short', 'medium', 'long'),
    allowNull: false
  },
  topic: {
    type: DataTypes.STRING,
    allowNull: false
  },
  audioUrl: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  upvoteCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

// Setup model associations function (called after all models are defined)
const setupAssociations = (models) => {
  const { User, Vocabulary, Grammar } = models;

  // Story belongs to a User
  Story.belongsTo(User, {
    foreignKey: 'userId',
    as: 'author'
  });

  // Story vocabulary relationship
  Story.belongsToMany(Vocabulary, {
    through: models.StoryVocabulary,
    foreignKey: 'storyId',
    otherKey: 'vocabularyId',
    as: 'vocabulary'
  });

  // Story grammar points relationship
  Story.belongsToMany(Grammar, {
    through: models.StoryGrammar,
    foreignKey: 'storyId',
    otherKey: 'grammarId',
    as: 'grammarPoints'
  });

  // Users who upvoted this story
  Story.belongsToMany(User, {
    through: models.UserUpvotedStories,
    foreignKey: 'storyId',
    otherKey: 'userId',
    as: 'upvotedBy'
  });

  // Users who read this story
  Story.belongsToMany(User, {
    through: models.UserReadStories,
    foreignKey: 'storyId',
    otherKey: 'userId',
    as: 'readBy'
  });
};

module.exports = { Story, setupAssociations }; 