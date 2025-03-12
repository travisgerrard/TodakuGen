import { createContext, useState, useCallback, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

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
  const { refreshUserData, isAuthenticated, token } = useAuth();

  // Get API headers with current token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  // Handle API errors
  const handleApiError = (error, errorMessage) => {
    console.error(errorMessage, error);
    
    // If unauthorized, try to refresh user data
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('Authentication error in StoryContext - attempting to refresh user data');
      refreshUserData();
      setError('Session expired. Please try again after logging in.');
    } else {
      setError(error.response?.data?.message || errorMessage);
    }
    
    setLoading(false);
  };

  // Get user stories
  const getUserStories = useCallback(async (retryAttempt = 0) => {
    try {
      if (!isAuthenticated || !token) {
        console.log('User not authenticated, cannot fetch stories');
        return [];
      }

      setLoading(true);
      setError(null);

      console.log('Fetching user stories from API');
      const { data } = await axios.get('/api/stories', getAuthHeaders());
      
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
      handleApiError(error, 'Failed to fetch stories');
      
      // Retry once if authentication error (might be fixed by the refresh)
      if (retryAttempt === 0 && 
          error.response && 
          (error.response.status === 401 || error.response.status === 403)) {
        console.log('Retrying getUserStories after auth error');
        // Short delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getUserStories(1);
      }
      
      // Return empty array to prevent cascading errors
      return [];
    }
  }, [isAuthenticated, token, refreshUserData]);

  // Generate a new story
  const generateStory = async (params = {}) => {
    try {
      if (!isAuthenticated || !token) {
        throw new Error('Authentication required');
      }

      setLoading(true);
      setError(null);

      // Build query string from params
      const queryParams = new URLSearchParams();
      if (params.topic) queryParams.append('topic', params.topic);
      if (params.japaneseLevel) queryParams.append('japaneseLevel', params.japaneseLevel);
      if (params.waniKaniLevel) queryParams.append('waniKaniLevel', params.waniKaniLevel);
      if (params.genkiChapter) queryParams.append('genkiChapter', params.genkiChapter);
      if (params.length) queryParams.append('length', params.length);

      const { data } = await axios.get(
        `/api/stories/generate?${queryParams.toString()}`,
        getAuthHeaders()
      );

      console.log('Generated story response:', data);
      
      setCurrentStory(data);
      setStories((prevStories) => [data, ...prevStories]);
      setLoading(false);
      
      // Use storyId from the response, which is what the server sends
      return data.storyId; // Return the id for redirecting
    } catch (error) {
      handleApiError(error, 'Failed to generate story');
      throw error;
    }
  };

  // Get a story by ID
  const getStoryById = async (storyId) => {
    try {
      if (!storyId) {
        setError('Story ID is required');
        return null;
      }

      if (!isAuthenticated || !token) {
        throw new Error('Authentication required');
      }

      setLoading(true);
      setError(null);

      console.log(`Fetching story with ID: ${storyId}`);
      const { data } = await axios.get(`/api/stories/${storyId}`, getAuthHeaders());
      
      setCurrentStory(data);
      setLoading(false);
      return data;
    } catch (error) {
      handleApiError(error, 'Failed to fetch story');
      return null;
    }
  };

  // Mark a story as complete
  const markStoryAsComplete = async (storyId) => {
    try {
      if (!storyId) {
        setError('Story ID is required');
        return false;
      }

      if (!isAuthenticated || !token) {
        throw new Error('Authentication required');
      }

      setLoading(true);
      setError(null);

      await axios.post(`/api/stories/${storyId}/complete`, {}, getAuthHeaders());
      
      // Update the local stories list to mark this story as completed
      setStories((prevStories) =>
        prevStories.map((story) =>
          story.storyId === storyId ? { ...story, completed: true } : story
        )
      );
      
      setLoading(false);
      return true;
    } catch (error) {
      handleApiError(error, 'Failed to mark story as complete');
      return false;
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
  
  // Translate a story
  const translateStory = async (storyId) => {
    try {
      if (!storyId) {
        setError('Story ID is required');
        return null;
      }

      if (!isAuthenticated || !token) {
        throw new Error('Authentication required');
      }

      setLoading(true);
      setError(null);

      console.log(`Requesting translation for story with ID: ${storyId}`);
      const { data } = await axios.post(`/api/stories/${storyId}/translate`, {}, getAuthHeaders());
      
      // Update current story if it's the same one
      if (currentStory && currentStory.storyId === storyId) {
        setCurrentStory({ ...currentStory, englishContent: data.englishContent });
      }
      
      setLoading(false);
      return data.englishContent;
    } catch (error) {
      handleApiError(error, 'Failed to translate story');
      return null;
    }
  };

  return (
    <StoryContext.Provider
      value={{
        stories,
        currentStory,
        loading,
        error,
        getUserStories,
        generateStory,
        getStoryById,
        markStoryAsComplete,
        getStoryReview,
        translateStory,
        clearError: () => setError(null),
      }}
    >
      {children}
    </StoryContext.Provider>
  );
};

export default StoryContext; 