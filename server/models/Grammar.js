const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Grammar = sequelize.define('Grammar', {
  rule: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  genkiChapter: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  examples: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  commonMistakes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  similarPatterns: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  timestamps: true
});

// Setup model associations function (called after all models are defined)
const setupAssociations = (models) => {
  const { Story } = models;

  // Grammar appears in many stories
  Grammar.belongsToMany(Story, {
    through: models.StoryGrammar,
    foreignKey: 'grammarId',
    otherKey: 'storyId',
    as: 'stories'
  });
};

module.exports = { Grammar, setupAssociations }; 