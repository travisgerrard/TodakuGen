import { createContext, useState, useCallback, useContext } from 'react';
import axios from 'axios';

const StoryContext = createContext();

// Custom hook for using StoryContext
export const useStory = () => {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
};

export const StoryProvider = ({ children }) => {
  const [stories, setStories] = useState([]);
  const [currentStory, setCurrentStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get user stories
  const getUserStories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };

      console.log('Fetching user stories from API');
      const { data } = await axios.get('/api/stories', config);
      
      if (!Array.isArray(data)) {
        console.error('Expected array of stories but got:', data);
        setStories([]);
        setLoading(false);
        return [];
      }
      
      console.log(`Fetched ${data.length} user stories`);
      setStories(data);
      setLoading(false);
      return data;
    } catch (error) {
      console.error('Error fetching user stories:', error);
      setError(error.response?.data?.message || 'Failed to fetch stories');
      setLoading(false);
      // Return empty array to prevent cascading errors
      return [];
    }
  }, []);

  // Generate a new story
  const generateStory = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };

      // Build query string from params
      const queryParams = new URLSearchParams();
      if (params.topic) queryParams.append('topic', params.topic);
      if (params.japaneseLevel) queryParams.append('japaneseLevel', params.japaneseLevel);
      if (params.waniKaniLevel) queryParams.append('waniKaniLevel', params.waniKaniLevel);
      if (params.genkiChapter) queryParams.append('genkiChapter', params.genkiChapter);
      if (params.length) queryParams.append('length', params.length);

      const { data } = await axios.get(
        `/api/stories/generate?${queryParams.toString()}`,
        config
      );

      console.log('Generated story response:', data);
      
      setCurrentStory(data);
      setStories((prevStories) => [data, ...prevStories]);
      setLoading(false);
      
      // Use storyId from the response, which is what the server sends
      return data.storyId; // Return the id for redirecting
    } catch (error) {
      console.error('Error generating story:', error);
      setError(error.response?.data?.message || 'Failed to generate story');
      setLoading(false);
      throw error;
    }
  };

  // Get a story by ID
  const getStoryById = async (id) => {
    try {
      setLoading(true);
      setError(null);

      // Validate ID
      if (!id) {
        setError('Invalid story ID');
        setLoading(false);
        return null;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };

      console.log(`Requesting story data from API for ID: ${id}`);
      const response = await axios.get(`/api/stories/${id}`, config);
      const data = response.data;
      
      // Check if we have English content, if not we might need to request it from the server
      const hasEnglishContent = data.englishContent && data.englishContent.length > 10;
      console.log('Received story data:', {
        title: data.title,
        contentLength: data.content?.length || 0,
        englishContentLength: data.englishContent?.length || 0,
        hasEnglishContent
      });
      
      // If there's no English content, try to request a translation
      if (data.content && !hasEnglishContent) {
        console.log("Story has no English translation. Requesting one now...");
        try {
          const translationResponse = await axios.post(
            `/api/stories/${id}/translate`, 
            {}, 
            config
          );
          
          if (translationResponse.data?.englishContent) {
            data.englishContent = translationResponse.data.englishContent;
            console.log(`Got translation (${data.englishContent.length} chars)`);
          }
        } catch (err) {
          console.error("Failed to get translation:", err);
          // Continue without translation if it fails
        }
      }
      
      // Validate received data
      if (!data || typeof data !== 'object') {
        console.error('Invalid data format received:', data);
        setError('Invalid data received from server');
        setLoading(false);
        return null;
      }
      
      // Check required fields
      if (!data.title || !data.content) {
        console.error('Missing required fields in story data:', data);
        setError('Story data is incomplete');
        setLoading(false);
        return null;
      }
      
      // Create a valid story object with all required fields
      const storyData = {
        storyId: data.storyId || id,
        title: data.title || 'Untitled Story',
        content: data.content || '',
        englishContent: data.englishContent || '',
        kanjiLevel: data.kanjiLevel || 0,
        grammarLevel: data.grammarLevel || 0,
        length: data.length || 'unknown',
        topic: data.topic || 'general',
      };
      
      setCurrentStory(storyData);
      setLoading(false);
      return storyData;
    } catch (error) {
      console.error('Error fetching story:', error);
      // Get detailed error information
      let errorMessage = 'Failed to fetch story';
      if (error.response) {
        // Server responded with an error status
        errorMessage = `Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`;
        console.error('Server response:', error.response.data);
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server - check your connection';
      } else {
        // Something happened in setting up the request
        errorMessage = `Request error: ${error.message}`;
      }
      
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  // Mark a story as complete
  const markStoryAsComplete = async (id) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };

      await axios.post(`/api/stories/${id}/complete`, {}, config);
      return true;
    } catch (error) {
      console.error('Error marking story as complete:', error);
      throw error;
    }
  };

  // Get story review (vocabulary and grammar)
  const getStoryReview = async (id) => {
    try {
      setLoading(true);
      setError(null);

      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };

      const { data } = await axios.get(`/api/stories/${id}/review`, config);
      setLoading(false);
      
      // Return an empty structure if data is incomplete
      if (!data) {
        return { vocabulary: [], grammarPoints: [] };
      }
      
      return {
        vocabulary: data.vocabulary || [],
        grammarPoints: data.grammarPoints || []
      };
    } catch (error) {
      console.error('Error fetching story review:', error);
      setError(error.response?.data?.message || 'Failed to fetch story review');
      setLoading(false);
      
      // Return empty structure on error
      return { vocabulary: [], grammarPoints: [] };
    }
  };
  
  // Request translation for a story
  const translateStory = async (id) => {
    try {
      if (!id) {
        console.error('No story ID provided for translation');
        throw new Error('Story ID is required');
      }
      
      console.log(`Requesting translation for story ID: ${id}`);
      
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };
      
      const response = await axios.post(`/api/stories/${id}/translate`, {}, config);
      
      if (!response.data || !response.data.englishContent) {
        console.error('Translation response did not contain expected data');
        throw new Error('Invalid translation response');
      }
      
      console.log(`Translation received (${response.data.englishContent.length} chars)`);
      
      // If we have the current story loaded and it matches this ID, update it
      if (currentStory && currentStory.storyId === id) {
        setCurrentStory({
          ...currentStory,
          englishContent: response.data.englishContent
        });
      }
      
      return response.data.englishContent;
    } catch (error) {
      console.error('Error translating story:', error);
      let errorMessage = 'Failed to translate story';
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server - check your connection';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      throw new Error(errorMessage);
    }
  };

  return (
    <StoryContext.Provider
      value={{
        stories,
        currentStory,
        loading,
        isLoading: loading,
        error,
        getUserStories,
        generateStory,
        getStoryById,
        markStoryAsComplete,
        getStoryReview,
        translateStory
      }}
    >
      {children}
    </StoryContext.Provider>
  );
};

export default StoryContext; 