const { User, setupAssociations: setupUserAssociations } = require('./User');
const { Story, setupAssociations: setupStoryAssociations } = require('./Story');
const { Vocabulary, setupAssociations: setupVocabularyAssociations } = require('./Vocabulary');
const { Grammar, setupAssociations: setupGrammarAssociations } = require('./Grammar');

// Gather all models in a simple object
const models = {
  User,
  Story,
  Vocabulary,
  Grammar
};

// Initialize all associations
const initializeAssociations = () => {
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