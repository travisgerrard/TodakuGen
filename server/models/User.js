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
    through: 'UserDifficultWords',
    foreignKey: 'userId',
    otherKey: 'vocabularyId',
    as: 'difficultWords'
  });

  // Define the attributes for the join table UserDifficultWords
  sequelize.define('UserDifficultWords', {
    sleepUntil: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, { timestamps: true });

  // Define read stories relationship
  User.belongsToMany(Story, {
    through: 'UserReadStories',
    foreignKey: 'userId',
    otherKey: 'storyId',
    as: 'readStories'
  });

  // Define the attributes for the join table UserReadStories
  sequelize.define('UserReadStories', {
    completedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, { timestamps: true });

  // Define upvoted stories relationship
  User.belongsToMany(Story, {
    through: 'UserUpvotedStories',
    foreignKey: 'userId',
    otherKey: 'storyId',
    as: 'upvotedStories'
  });
};

module.exports = { User, setupAssociations }; 