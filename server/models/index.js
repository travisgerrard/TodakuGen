const { User, setupAssociations: setupUserAssociations } = require('./User');
const { Story, setupAssociations: setupStoryAssociations } = require('./Story');
const { Vocabulary, setupAssociations: setupVocabularyAssociations } = require('./Vocabulary');
const { Grammar, setupAssociations: setupGrammarAssociations } = require('./Grammar');
const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// Gather all models in a simple object
const models = {
  User,
  Story,
  Vocabulary,
  Grammar
};

// Initialize all associations and create join tables
const initializeAssociations = () => {
  console.log('Initializing model associations and join tables...');
  
  // Explicitly define join tables first
  const UserDifficultWords = sequelize.define('UserDifficultWords', {
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    vocabularyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Vocabularies',
        key: 'id'
      }
    },
    sleepUntil: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, { timestamps: true });
  
  const UserReadStories = sequelize.define('UserReadStories', {
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    storyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Stories',
        key: 'id'
      }
    },
    completedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, { timestamps: true });
  
  const UserUpvotedStories = sequelize.define('UserUpvotedStories', {
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    storyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Stories',
        key: 'id'
      }
    }
  }, { timestamps: true });
  
  const StoryVocabulary = sequelize.define('StoryVocabulary', {
    storyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Stories',
        key: 'id'
      }
    },
    vocabularyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Vocabularies',
        key: 'id'
      }
    },
    frequency: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, { timestamps: true });
  
  const StoryGrammar = sequelize.define('StoryGrammar', {
    storyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Stories',
        key: 'id'
      }
    },
    grammarId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Grammars',
        key: 'id'
      }
    }
  }, { timestamps: true });
  
  // Add join tables to models object
  models.UserDifficultWords = UserDifficultWords;
  models.UserReadStories = UserReadStories; 
  models.UserUpvotedStories = UserUpvotedStories;
  models.StoryVocabulary = StoryVocabulary;
  models.StoryGrammar = StoryGrammar;
  
  // Now set up associations using the defined join tables
  setupUserAssociations(models);
  setupStoryAssociations(models);
  setupVocabularyAssociations(models);
  setupGrammarAssociations(models);
  
  console.log('Model associations initialized');
};

module.exports = {
  ...models,
  initializeAssociations
}; 