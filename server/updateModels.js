const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Grammar = require('./models/Grammar');
const Vocabulary = require('./models/Vocabulary');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Update Grammar models with new fields
const updateGrammarModels = async () => {
  try {
    console.log('Updating Grammar models with new fields...');
    
    // Add commonMistakes field if it doesn't exist
    const grammarUpdateCommonMistakes = await Grammar.updateMany(
      { commonMistakes: { $exists: false } },
      { $set: { commonMistakes: '' } }
    );
    
    console.log(`Updated ${grammarUpdateCommonMistakes.modifiedCount} Grammar documents with commonMistakes field`);
    
    // Add similarPatterns field if it doesn't exist
    const grammarUpdateSimilarPatterns = await Grammar.updateMany(
      { similarPatterns: { $exists: false } },
      { $set: { similarPatterns: '' } }
    );
    
    console.log(`Updated ${grammarUpdateSimilarPatterns.modifiedCount} Grammar documents with similarPatterns field`);
    
    return {
      commonMistakesCount: grammarUpdateCommonMistakes.modifiedCount,
      similarPatternsCount: grammarUpdateSimilarPatterns.modifiedCount
    };
  } catch (error) {
    console.error('Error updating Grammar models:', error);
    throw error;
  }
};

// Update Vocabulary models with notes field
const updateVocabularyModels = async () => {
  try {
    console.log('Updating Vocabulary models with notes field...');
    
    // Add notes field if it doesn't exist
    const vocabularyUpdateNotes = await Vocabulary.updateMany(
      { notes: { $exists: false } },
      { $set: { notes: '' } }
    );
    
    console.log(`Updated ${vocabularyUpdateNotes.modifiedCount} Vocabulary documents with notes field`);
    
    return {
      notesCount: vocabularyUpdateNotes.modifiedCount
    };
  } catch (error) {
    console.error('Error updating Vocabulary models:', error);
    throw error;
  }
};

// Run updates
const runUpdates = async () => {
  try {
    // Update Grammar models
    const grammarResults = await updateGrammarModels();
    
    // Update Vocabulary models
    const vocabularyResults = await updateVocabularyModels();
    
    console.log('Updates completed successfully:');
    console.log('Grammar updates:', grammarResults);
    console.log('Vocabulary updates:', vocabularyResults);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error('Error running updates:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the update process
runUpdates(); 