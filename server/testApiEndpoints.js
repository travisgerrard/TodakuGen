require('dotenv').config();
const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5001';
const USERNAME = 'Travis';
const PASSWORD = 'password'; // Adjust if needed

// Global variables
let authToken;
let testWordId;

// Test 1: Login to get auth token
const login = async () => {
  try {
    console.log('Logging in as', USERNAME);
    console.log('Making request to:', `${BASE_URL}/api/auth/login`);
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: USERNAME,
    });
    
    console.log('Login response:', response.data);
    
    authToken = response.data.token;
    
    if (!authToken) {
      console.error('No token received');
      return false;
    }
    
    console.log('Successfully logged in and received token');
    return true;
  } catch (error) {
    console.error('Login failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Server might be down.');
    }
    return false;
  }
};

// Test 2: Search for a vocabulary word
const searchWord = async (query = 'がっこう') => {
  try {
    console.log(`Searching for vocabulary word: "${query}"`);
    
    const config = {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    };
    
    // First try a standard search
    let response = await axios.get(
      `${BASE_URL}/api/vocabulary?query=${encodeURIComponent(query)}`,
      config
    );
    
    if (!response.data || response.data.length === 0) {
      console.log('Word not found in standard search, trying with addIfNotFound=true');
      
      // If not found, try with addIfNotFound=true
      response = await axios.get(
        `${BASE_URL}/api/vocabulary?query=${encodeURIComponent(query)}&addIfNotFound=true`,
        config
      );
      
      if (response.data && response.data.length > 0) {
        console.log('Successfully added the word to the database!');
      } else {
        console.error('Still no words found even with addIfNotFound=true');
        return false;
      }
    }
    
    // Use the first word found
    testWordId = response.data[0]._id;
    console.log(`Found word with ID: ${testWordId}`);
    console.log(`Word details: ${JSON.stringify(response.data[0], null, 2)}`);
    
    return true;
  } catch (error) {
    console.error('Search failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 3: Mark the word as difficult
const markAsDifficult = async () => {
  try {
    if (!testWordId) {
      console.error('No word ID to mark as difficult');
      return false;
    }
    
    console.log(`Marking word ID ${testWordId} as difficult`);
    
    const config = {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    };
    
    const response = await axios.post(
      `${BASE_URL}/api/words/mark`,
      { wordId: testWordId, sleepDays: 7 },
      config
    );
    
    console.log('Response:', response.data);
    return response.data.success === true;
  } catch (error) {
    console.error('Mark as difficult failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 4: Get difficult words
const getDifficultWords = async () => {
  try {
    console.log('Getting difficult words');
    
    const config = {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    };
    
    const response = await axios.get(`${BASE_URL}/api/words/difficult`, config);
    
    if (!response.data) {
      console.error('No data received from difficult words endpoint');
      return false;
    }
    
    console.log(`Found ${response.data.length} difficult words (${response.data.filter(w => w.active).length} active)`);
    
    // Check if our test word is in the list
    const foundWord = response.data.find(
      (w) => w.wordId && w.wordId._id === testWordId
    );
    
    if (foundWord) {
      console.log(`Success! Our test word (ID: ${testWordId}) is in the difficult words list`);
      console.log(`Word details: ${JSON.stringify(foundWord.wordId, null, 2)}`);
      console.log(`Active: ${foundWord.active}, Sleep remaining: ${foundWord.sleepRemaining} days`);
      return true;
    } else {
      console.log('Difficult words received:', response.data);
      console.error(`Failed! Our test word (ID: ${testWordId}) is not in the difficult words list`);
      return false;
    }
  } catch (error) {
    console.error('Get difficult words failed:', error.response?.data || error.message);
    return false;
  }
};

// Run all tests in sequence
const runAllTests = async () => {
  try {
    console.log('\n---------- Test 1: Login ----------');
    const loginOk = await login();
    if (!loginOk) return;
    
    console.log('\n---------- Test 2: Search for Word ----------');
    const searchOk = await searchWord('図書館'); // Test with "library" in Japanese
    if (!searchOk) return;
    
    console.log('\n---------- Test 3: Mark as Difficult ----------');
    const markOk = await markAsDifficult();
    if (!markOk) return;
    
    console.log('\n---------- Test 4: Get Difficult Words ----------');
    const getOk = await getDifficultWords();
    
    console.log('\n---------- Test Results ----------');
    console.log(`Login test: ${loginOk ? 'PASSED' : 'FAILED'}`);
    console.log(`Search test: ${searchOk ? 'PASSED' : 'FAILED'}`);
    console.log(`Mark test: ${markOk ? 'PASSED' : 'FAILED'}`);
    console.log(`Get test: ${getOk ? 'PASSED' : 'FAILED'}`);
    console.log(`Overall result: ${loginOk && searchOk && markOk && getOk ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
};

// Run the tests
runAllTests(); 