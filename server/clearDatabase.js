const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Story = require('./models/Story');
const Vocabulary = require('./models/Vocabulary');
const Grammar = require('./models/Grammar');
const User = require('./models/User');

// Load env vars
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const clearDatabase = async () => {
  try {
    console.log('Starting database cleanup...');
    
    // Clear stories
    const storyResult = await Story.deleteMany({});
    console.log(`Deleted ${storyResult.deletedCount} stories`);
    
    // Clear vocabulary
    const vocabResult = await Vocabulary.deleteMany({});
    console.log(`Deleted ${vocabResult.deletedCount} vocabulary items`);
    
    // Clear grammar
    const grammarResult = await Grammar.deleteMany({});
    console.log(`Deleted ${grammarResult.deletedCount} grammar points`);
    
    // Reset difficultWords for all users
    const userResult = await User.updateMany({}, { $set: { difficultWords: [] } });
    console.log(`Reset difficultWords for ${userResult.modifiedCount} users`);
    
    console.log('Database cleanup complete');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase(); 