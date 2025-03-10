require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Vocabulary = require('./models/Vocabulary');

// Global variables for test
let testUser;
let testWord;

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tadokugen');
    console.log('MongoDB Connected for testing');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

// Test 1: Get the current user
const getUser = async (username = 'Travis') => {
  try {
    testUser = await User.findOne({ username }).populate('difficultWords.wordId');
    
    if (!testUser) {
      console.error(`User '${username}' not found`);
      return false;
    }
    
    console.log(`Found user: ${testUser.username} (${testUser._id})`);
    console.log(`Current difficult words count: ${testUser.difficultWords.length}`);
    
    if (testUser.difficultWords.length > 0) {
      console.log('Current difficult words:');
      testUser.difficultWords.forEach(word => {
        console.log(`- ${word.wordId ? word.wordId.kanji || word.wordId.reading : 'Unknown'} (ID: ${word.wordId ? word.wordId._id : 'N/A'}) - Sleep until: ${word.sleepUntil}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error getting user:', error);
    return false;
  }
};

// Test 2: Find a vocabulary word to mark
const findVocabularyWord = async () => {
  try {
    testWord = await Vocabulary.findOne();
    
    if (!testWord) {
      // Create a test word if none exists
      testWord = new Vocabulary({
        kanji: '勉強',
        reading: 'べんきょう',
        meaning: 'study',
        kanjiLevel: 3,
        grammarLevel: 2,
        jlpt: 5
      });
      
      await testWord.save();
      console.log('Created new test word:', testWord.kanji);
    } else {
      console.log(`Found existing word: ${testWord.kanji || testWord.reading} (ID: ${testWord._id})`);
    }
    
    return true;
  } catch (error) {
    console.error('Error finding vocabulary word:', error);
    return false;
  }
};

// Test 3: Mark the word as difficult
const markWordAsDifficult = async () => {
  try {
    if (!testUser || !testWord) {
      console.error('Test user or test word not initialized');
      return false;
    }
    
    // Remove if already in difficultWords (to avoid duplicates)
    testUser.difficultWords = testUser.difficultWords.filter(
      (w) => !w.wordId || w.wordId.toString() !== testWord._id.toString()
    );
    
    // Calculate the date when this word should be shown again (7 days)
    const sleepUntil = new Date();
    sleepUntil.setDate(sleepUntil.getDate() + 7);
    
    // Add to difficultWords
    testUser.difficultWords.push({
      wordId: testWord._id,
      sleepUntil,
    });
    
    await testUser.save();
    
    console.log(`Word "${testWord.kanji || testWord.reading}" marked as difficult until ${sleepUntil}`);
    return true;
  } catch (error) {
    console.error('Error marking word as difficult:', error);
    return false;
  }
};

// Test 4: Verify the word was added correctly
const verifyWordAdded = async () => {
  try {
    // Reload the user to ensure we have fresh data
    testUser = await User.findById(testUser._id).populate('difficultWords.wordId');
    
    if (!testUser) {
      console.error('User not found when verifying');
      return false;
    }
    
    console.log(`User now has ${testUser.difficultWords.length} difficult words`);
    
    // Check if our test word is in the list
    const foundWord = testUser.difficultWords.find(
      (w) => w.wordId && w.wordId._id.toString() === testWord._id.toString()
    );
    
    if (foundWord) {
      console.log(`Success! Word "${testWord.kanji || testWord.reading}" is in the difficult words list`);
      console.log(`Sleep until: ${foundWord.sleepUntil}`);
      return true;
    } else {
      console.error(`Failed! Word "${testWord.kanji || testWord.reading}" not found in difficult words list`);
      return false;
    }
  } catch (error) {
    console.error('Error verifying word added:', error);
    return false;
  }
};

// Run all tests
const runAllTests = async () => {
  try {
    const connected = await connectDB();
    if (!connected) return;
    
    console.log('\n---------- Test 1: Get User ----------');
    const userOk = await getUser();
    if (!userOk) return;
    
    console.log('\n---------- Test 2: Find Vocabulary Word ----------');
    const wordOk = await findVocabularyWord();
    if (!wordOk) return;
    
    console.log('\n---------- Test 3: Mark Word as Difficult ----------');
    const markOk = await markWordAsDifficult();
    if (!markOk) return;
    
    console.log('\n---------- Test 4: Verify Word Added ----------');
    const verifyOk = await verifyWordAdded();
    
    console.log('\n---------- Test Results ----------');
    console.log(`User test: ${userOk ? 'PASSED' : 'FAILED'}`);
    console.log(`Word test: ${wordOk ? 'PASSED' : 'FAILED'}`);
    console.log(`Mark test: ${markOk ? 'PASSED' : 'FAILED'}`);
    console.log(`Verify test: ${verifyOk ? 'PASSED' : 'FAILED'}`);
    console.log(`Overall result: ${userOk && wordOk && markOk && verifyOk ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

// Run the tests
runAllTests(); 