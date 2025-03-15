/**
 * Data Migration Script: MongoDB to PostgreSQL
 * 
 * This script will:
 * 1. Connect to both MongoDB and PostgreSQL
 * 2. Fetch all data from MongoDB
 * 3. Transform data as needed for PostgreSQL
 * 4. Insert data into PostgreSQL tables
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { sequelize } = require('../config/db');
const models = require('../models');
const { User, Story, Vocabulary, Grammar } = models;

// MongoDB connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// Connect to MongoDB
const connectMongo = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, mongoOptions);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// MongoDB models (using the same schema but with Mongoose)
const MongoUser = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const MongoStory = mongoose.model('Story', new mongoose.Schema({}, { strict: false }));
const MongoVocabulary = mongoose.model('Vocabulary', new mongoose.Schema({}, { strict: false }));
const MongoGrammar = mongoose.model('Grammar', new mongoose.Schema({}, { strict: false }));

// ID mapping between MongoDB and PostgreSQL
const idMap = {
  users: {},
  stories: {},
  vocabulary: {},
  grammar: {}
};

// Migration functions
const migrateUsers = async () => {
  console.log('Migrating users...');
  const users = await MongoUser.find({});
  
  console.log(`Found ${users.length} users in MongoDB`);
  
  for (const mongoUser of users) {
    try {
      // Convert MongoDB document to plain object
      const userData = mongoUser.toObject();
      
      // Create user in PostgreSQL
      const pgUser = await User.create({
        username: userData.username,
        waniKaniLevel: userData.waniKaniLevel || 1,
        genkiChapter: userData.genkiChapter || 0,
        preferences: {
          storyLength: userData.preferences?.storyLength || 'medium',
          maxKanjiLevel: userData.preferences?.maxKanjiLevel || 5,
          maxGrammarLevel: userData.preferences?.maxGrammarLevel || 3,
          topics: userData.preferences?.topics || ['daily life', 'school', 'travel']
        }
      });
      
      // Store ID mapping
      idMap.users[mongoUser._id.toString()] = pgUser.id;
      console.log(`Migrated user: ${userData.username}`);
    } catch (error) {
      console.error(`Error migrating user ${mongoUser._id}: ${error.message}`);
    }
  }
  
  console.log(`Migrated ${Object.keys(idMap.users).length} users`);
};

const migrateVocabulary = async () => {
  console.log('Migrating vocabulary...');
  const vocabulary = await MongoVocabulary.find({});
  
  console.log(`Found ${vocabulary.length} vocabulary items in MongoDB`);
  
  for (const mongoVocab of vocabulary) {
    try {
      // Convert MongoDB document to plain object
      const vocabData = mongoVocab.toObject();
      
      // Create vocabulary in PostgreSQL
      const pgVocab = await Vocabulary.create({
        word: vocabData.word,
        reading: vocabData.reading,
        meaning: vocabData.meaning,
        kanjiLevel: vocabData.kanjiLevel,
        notes: vocabData.notes || '',
        exampleSentences: vocabData.exampleSentences || []
      });
      
      // Store ID mapping
      idMap.vocabulary[mongoVocab._id.toString()] = pgVocab.id;
      console.log(`Migrated vocabulary: ${vocabData.word}`);
    } catch (error) {
      console.error(`Error migrating vocabulary ${mongoVocab._id}: ${error.message}`);
    }
  }
  
  console.log(`Migrated ${Object.keys(idMap.vocabulary).length} vocabulary items`);
};

const migrateGrammar = async () => {
  console.log('Migrating grammar...');
  const grammar = await MongoGrammar.find({});
  
  console.log(`Found ${grammar.length} grammar items in MongoDB`);
  
  for (const mongoGrammar of grammar) {
    try {
      // Convert MongoDB document to plain object
      const grammarData = mongoGrammar.toObject();
      
      // Create grammar in PostgreSQL
      const pgGrammar = await Grammar.create({
        rule: grammarData.rule,
        genkiChapter: grammarData.genkiChapter,
        explanation: grammarData.explanation,
        examples: grammarData.examples || [],
        commonMistakes: grammarData.commonMistakes || '',
        similarPatterns: grammarData.similarPatterns || ''
      });
      
      // Store ID mapping
      idMap.grammar[mongoGrammar._id.toString()] = pgGrammar.id;
      console.log(`Migrated grammar: ${grammarData.rule}`);
    } catch (error) {
      console.error(`Error migrating grammar ${mongoGrammar._id}: ${error.message}`);
    }
  }
  
  console.log(`Migrated ${Object.keys(idMap.grammar).length} grammar items`);
};

const migrateStories = async () => {
  console.log('Migrating stories...');
  const stories = await MongoStory.find({});
  
  console.log(`Found ${stories.length} stories in MongoDB`);
  
  for (const mongoStory of stories) {
    try {
      // Convert MongoDB document to plain object
      const storyData = mongoStory.toObject();
      
      // Skip if user doesn't exist in our mapping
      if (!idMap.users[storyData.user.toString()]) {
        console.log(`Skipping story "${storyData.title}" - user not found in mapping`);
        continue;
      }
      
      // Create story in PostgreSQL
      const pgStory = await Story.create({
        title: storyData.title,
        content: storyData.content,
        englishContent: storyData.englishContent || '',
        kanjiLevel: storyData.kanjiLevel,
        grammarLevel: storyData.grammarLevel,
        length: storyData.length,
        topic: storyData.topic,
        audioUrl: storyData.audioUrl || null,
        upvoteCount: storyData.upvoteCount || 0,
        isPublic: storyData.isPublic === false ? false : true,
        userId: idMap.users[storyData.user.toString()]
      });
      
      // Store ID mapping
      idMap.stories[mongoStory._id.toString()] = pgStory.id;
      console.log(`Migrated story: ${storyData.title}`);
    } catch (error) {
      console.error(`Error migrating story ${mongoStory._id}: ${error.message}`);
    }
  }
  
  console.log(`Migrated ${Object.keys(idMap.stories).length} stories`);
};

const migrateRelationships = async () => {
  console.log('Migrating relationships...');
  
  // 1. Migrate difficult words relationship
  const users = await MongoUser.find({ 'difficultWords.0': { $exists: true } });
  console.log(`Found ${users.length} users with difficult words`);
  
  const UserDifficultWords = sequelize.model('UserDifficultWords');
  
  for (const mongoUser of users) {
    try {
      const userData = mongoUser.toObject();
      const pgUserId = idMap.users[mongoUser._id.toString()];
      
      if (!pgUserId) continue;
      
      for (const difficultWord of userData.difficultWords || []) {
        const vocabId = difficultWord.wordId.toString();
        const pgVocabId = idMap.vocabulary[vocabId];
        
        if (!pgVocabId) continue;
        
        await UserDifficultWords.create({
          userId: pgUserId,
          vocabularyId: pgVocabId,
          sleepUntil: difficultWord.sleepUntil || new Date()
        });
      }
    } catch (error) {
      console.error(`Error migrating difficult words for user ${mongoUser._id}: ${error.message}`);
    }
  }
  
  // 2. Migrate read stories relationship
  const usersWithReadStories = await MongoUser.find({ 'readStories.0': { $exists: true } });
  console.log(`Found ${usersWithReadStories.length} users with read stories`);
  
  const UserReadStories = sequelize.model('UserReadStories');
  
  for (const mongoUser of usersWithReadStories) {
    try {
      const userData = mongoUser.toObject();
      const pgUserId = idMap.users[mongoUser._id.toString()];
      
      if (!pgUserId) continue;
      
      for (const readStory of userData.readStories || []) {
        const storyId = readStory.storyId.toString();
        const pgStoryId = idMap.stories[storyId];
        
        if (!pgStoryId) continue;
        
        await UserReadStories.create({
          userId: pgUserId,
          storyId: pgStoryId,
          completedAt: readStory.completedAt || new Date()
        });
      }
    } catch (error) {
      console.error(`Error migrating read stories for user ${mongoUser._id}: ${error.message}`);
    }
  }
  
  // 3. Migrate upvoted stories relationship
  const usersWithUpvotes = await MongoUser.find({ 'upvotedStories.0': { $exists: true } });
  console.log(`Found ${usersWithUpvotes.length} users with upvoted stories`);
  
  const UserUpvotedStories = sequelize.model('UserUpvotedStories');
  
  for (const mongoUser of usersWithUpvotes) {
    try {
      const userData = mongoUser.toObject();
      const pgUserId = idMap.users[mongoUser._id.toString()];
      
      if (!pgUserId) continue;
      
      for (const upvotedStoryId of userData.upvotedStories || []) {
        const storyId = upvotedStoryId.toString();
        const pgStoryId = idMap.stories[storyId];
        
        if (!pgStoryId) continue;
        
        await UserUpvotedStories.create({
          userId: pgUserId,
          storyId: pgStoryId
        });
      }
    } catch (error) {
      console.error(`Error migrating upvoted stories for user ${mongoUser._id}: ${error.message}`);
    }
  }
  
  // 4. Migrate story vocabulary relationship
  const storiesWithVocab = await MongoStory.find({ 'vocabulary.0': { $exists: true } });
  console.log(`Found ${storiesWithVocab.length} stories with vocabulary`);
  
  const StoryVocabulary = sequelize.model('StoryVocabulary');
  
  for (const mongoStory of storiesWithVocab) {
    try {
      const storyData = mongoStory.toObject();
      const pgStoryId = idMap.stories[mongoStory._id.toString()];
      
      if (!pgStoryId) continue;
      
      for (const vocabItem of storyData.vocabulary || []) {
        const vocabId = vocabItem.wordId.toString();
        const pgVocabId = idMap.vocabulary[vocabId];
        
        if (!pgVocabId) continue;
        
        await StoryVocabulary.create({
          storyId: pgStoryId,
          vocabularyId: pgVocabId,
          frequency: vocabItem.frequency || 1
        });
      }
    } catch (error) {
      console.error(`Error migrating vocabulary for story ${mongoStory._id}: ${error.message}`);
    }
  }
  
  // 5. Migrate story grammar relationship
  const storiesWithGrammar = await MongoStory.find({ 'grammarPoints.0': { $exists: true } });
  console.log(`Found ${storiesWithGrammar.length} stories with grammar points`);
  
  const StoryGrammar = sequelize.model('StoryGrammar');
  
  for (const mongoStory of storiesWithGrammar) {
    try {
      const storyData = mongoStory.toObject();
      const pgStoryId = idMap.stories[mongoStory._id.toString()];
      
      if (!pgStoryId) continue;
      
      for (const grammarId of storyData.grammarPoints || []) {
        const grammarIdStr = grammarId.toString();
        const pgGrammarId = idMap.grammar[grammarIdStr];
        
        if (!pgGrammarId) continue;
        
        await StoryGrammar.create({
          storyId: pgStoryId,
          grammarId: pgGrammarId
        });
      }
    } catch (error) {
      console.error(`Error migrating grammar for story ${mongoStory._id}: ${error.message}`);
    }
  }
  
  console.log('Finished migrating relationships');
};

// Main migration function
const migrate = async () => {
  try {
    // Connect to MongoDB
    const mongoConn = await connectMongo();
    
    // Initialize Sequelize and connect to PostgreSQL
    await sequelize.authenticate();
    console.log('PostgreSQL Connected: Connection has been established successfully.');
    
    // Initialize model associations
    models.initializeAssociations();
    
    // Sync PostgreSQL tables (force: true will drop tables if they exist)
    if (process.env.SYNC_DB_FORCE === 'true') {
      console.log('WARNING: Forcing database sync (all data will be lost)');
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync();
    }
    console.log('Database synchronized');
    
    // Migrate data in order of dependencies
    await migrateUsers();
    await migrateVocabulary();
    await migrateGrammar();
    await migrateStories();
    await migrateRelationships();
    
    console.log('Migration complete!');
    
    // Close connections
    await mongoConn.disconnect();
    await sequelize.close();
    
    process.exit(0);
  } catch (error) {
    console.error(`Migration failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the migration
migrate(); 