require('dotenv').config();
const mongoose = require('mongoose');
const Story = require('./models/Story');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tadokugen')
  .then(async () => {
    console.log('MongoDB Connected for migration');
    
    try {
      // Get a user ID to assign
      const user = await User.findOne({});
      
      if (!user) {
        console.error('No users found in the database. Please create a user first.');
        process.exit(1);
      }
      
      console.log(`Using user ID: ${user._id} for migration`);
      
      // Find all stories that don't have a user field
      const stories = await Story.find({ user: { $exists: false } });
      
      console.log(`Found ${stories.length} stories without user field`);
      
      if (stories.length === 0) {
        console.log('No stories need migration.');
        process.exit(0);
      }
      
      // Update all stories to assign them to this user
      for (const story of stories) {
        story.user = user._id;
        await story.save();
        console.log(`Updated story: ${story.title}`);
      }
      
      console.log('Migration complete!');
      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 