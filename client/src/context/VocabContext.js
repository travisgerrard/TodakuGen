import { createContext, useState, useCallback, useRef } from 'react';
import axios from 'axios';

const VocabContext = createContext();

export const VocabProvider = ({ children }) => {
  const [difficultWords, setDifficultWords] = useState([]);
  const [reviewWords, setReviewWords] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Track API calls to prevent duplicates
  const apiCalls = useRef({
    difficult: {
      lastCallTime: 0,
      inProgress: false
    },
    review: {
      lastCallTime: 0,
      inProgress: false
    }
  });
  
  // Minimum time between API calls in milliseconds (5 seconds)
  const API_THROTTLE_MS = 5000;

  // Mark a word as difficult
  const markWordAsDifficult = async (wordId, sleepDays = 7) => {
    try {
      if (!wordId) {
        console.error('markWordAsDifficult: No wordId provided');
        return false;
      }

      console.log(`Marking word ${wordId} as difficult with sleepDays=${sleepDays}`);

      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };

      const response = await axios.post('/api/words/mark', { wordId, sleepDays }, config);
      
      if (!response.data || !response.data.success) {
        console.error('markWordAsDifficult: API call succeeded but returned failure:', response.data);
        return false;
      }
      
      console.log('Word successfully marked as difficult:', response.data);
      
      // Update local state - fetch fresh data
      await getDifficultWords();
      
      return true;
    } catch (error) {
      console.error('Error marking word as difficult:', error.response?.data || error.message);
      setError('Failed to mark word as difficult');
      return false;
    }
  };

  // Get difficult words
  const getDifficultWords = useCallback(async () => {
    try {
      // Check if we're already fetching or if we've fetched recently
      const now = Date.now();
      if (apiCalls.current.difficult.inProgress) {
        console.log('Fetch already in progress, skipping');
        return difficultWords;
      }
      
      if (now - apiCalls.current.difficult.lastCallTime < API_THROTTLE_MS) {
        console.log('Throttling API call, returning cached data');
        return difficultWords;
      }
      
      // Mark that we're starting an API call
      apiCalls.current.difficult.inProgress = true;
      apiCalls.current.difficult.lastCallTime = now;
      
      setLoading(true);
      setError(null);

      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };

      console.log('Making API call to fetch difficult words');
      const { data } = await axios.get('/api/words/difficult', config);
      
      // Ensure we have an array even if API returns null or undefined
      const safeData = Array.isArray(data) ? data : [];
      setDifficultWords(safeData);
      setLoading(false);
      
      // Mark that we've finished the API call
      apiCalls.current.difficult.inProgress = false;
      
      return safeData;
    } catch (error) {
      console.error('Error fetching difficult words:', error);
      setError(error.response?.data?.message || 'Failed to fetch difficult words');
      setLoading(false);
      
      // Reset the in progress flag even on error
      apiCalls.current.difficult.inProgress = false;
      
      // Return empty array instead of throwing to prevent cascading errors
      return [];
    }
  }, [difficultWords]);

  // Get words for review
  const getWordsForReview = useCallback(async () => {
    try {
      // Check if we're already fetching or if we've fetched recently
      const now = Date.now();
      if (apiCalls.current.review.inProgress) {
        console.log('Review fetch already in progress, skipping');
        return reviewWords;
      }
      
      if (now - apiCalls.current.review.lastCallTime < API_THROTTLE_MS) {
        console.log('Throttling review API call, returning cached data');
        return reviewWords;
      }
      
      // Mark that we're starting an API call
      apiCalls.current.review.inProgress = true;
      apiCalls.current.review.lastCallTime = now;
      
      setLoading(true);
      setError(null);

      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };

      console.log('Making API call to fetch review words');
      const { data } = await axios.get('/api/words/review', config);
      
      // Ensure we have an array even if API returns null or undefined
      const safeData = Array.isArray(data) ? data : [];
      setReviewWords(safeData);
      setLoading(false);
      
      // Mark that we've finished the API call
      apiCalls.current.review.inProgress = false;
      
      return safeData;
    } catch (error) {
      console.error('Error fetching review words:', error);
      setError(error.response?.data?.message || 'Failed to fetch review words');
      setLoading(false);
      
      // Reset the in progress flag even on error
      apiCalls.current.review.inProgress = false;
      
      // Return empty array instead of throwing to prevent cascading errors
      return [];
    }
  }, [reviewWords]);

  // Search vocabulary
  const searchVocabulary = async (query, kanjiLevel) => {
    try {
      setLoading(true);
      setError(null);

      if (!query || !query.trim()) {
        setSearchResults([]);
        setLoading(false);
        return [];
      }

      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };

      // Build query string
      const queryParams = new URLSearchParams();
      if (query) queryParams.append('query', query.trim());
      if (kanjiLevel) queryParams.append('kanjiLevel', kanjiLevel);

      const { data } = await axios.get(
        `/api/vocabulary?${queryParams.toString()}`,
        config
      );
      
      // Ensure we have an array even if API returns null or undefined
      const safeData = Array.isArray(data) ? data : [];
      setSearchResults(safeData);
      setLoading(false);
      return safeData;
    } catch (error) {
      console.error('Error searching vocabulary:', error);
      setError(error.response?.data?.message || 'Failed to search vocabulary');
      setLoading(false);
      // Return empty array instead of throwing to prevent cascading errors
      setSearchResults([]);
      return [];
    }
  };

  return (
    <VocabContext.Provider
      value={{
        difficultWords,
        reviewWords,
        searchResults,
        loading,
        error,
        markWordAsDifficult,
        getDifficultWords,
        getWordsForReview,
        searchVocabulary,
      }}
    >
      {children}
    </VocabContext.Provider>
  );
};

export default VocabContext; 