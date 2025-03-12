import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import StoryContext from '../context/StoryContext';
import { useAuth } from '../context/AuthContext';

const Story = () => {
  const { id } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { translateStory, upvoteStory } = useContext(StoryContext);
  const { user } = useAuth();
  
  // Upvote state
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [isUpvoting, setIsUpvoting] = useState(false);
  
  // Translation state
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  
  useEffect(() => {
    const fetchStory = async () => {
      try {
        setLoading(true);
        console.log("Fetching story with ID:", id);
        const response = await api.get(`/stories/${id}`);
        console.log("API Response:", response.data);
        setStory(response.data);
        
        // Set upvote information if available
        if (response.data.hasUpvoted !== undefined) {
          console.log("Setting hasUpvoted to:", response.data.hasUpvoted);
          setHasUpvoted(response.data.hasUpvoted);
        }
        if (response.data.upvoteCount !== undefined) {
          console.log("Setting upvoteCount to:", response.data.upvoteCount);
          setUpvoteCount(response.data.upvoteCount);
        }
        
        setError(null);
        
        // Request translation automatically if it doesn't exist
        if (!response.data.englishContent || response.data.englishContent.length < 10) {
          requestTranslation(response.data);
        }
      } catch (err) {
        console.error('Error fetching story:', err);
        console.error('Error response:', err.response?.data);
        setError('Failed to load the story. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStory();
  }, [id, requestTranslation]);
  
  // Request translation function
  const requestTranslation = useCallback(async (data) => {
    const storyData = data || story;
    if (!storyData || !id) {
      console.error('Cannot request translation: No story or story ID available');
      return;
    }

    // If we already have a translation, no need to request again
    if (storyData.englishContent && storyData.englishContent.length > 10) {
      console.log('Story already has translation');
      return;
    }

    try {
      setIsTranslating(true);
      setTranslationError('');
      console.log(`Requesting translation for story ID: ${id}`);

      // Use the translateStory function from context
      const englishContent = await translateStory(id);
      
      // Update the story with the new translation
      if (englishContent) {
        console.log(`Translation received (${englishContent.length} chars)`);
        
        // Update the story state with the new translation
        setStory(prevStory => ({
          ...prevStory,
          englishContent: englishContent
        }));
      } else {
        throw new Error('Translation response missing expected data');
      }
    } catch (error) {
      console.error('Translation request failed:', error);
      setTranslationError(
        error.message || 
        'Failed to translate story'
      );
    } finally {
      setIsTranslating(false);
    }
  }, [id, story, translateStory]);
  
  // Handle upvote
  const handleUpvote = async () => {
    if (!id || isUpvoting) return;
    
    try {
      setIsUpvoting(true);
      console.log('Calling upvoteStory with ID:', id);
      const result = await upvoteStory(id);
      
      if (result) {
        console.log('Upvote result:', result);
        setHasUpvoted(result.hasUpvoted);
        setUpvoteCount(result.upvoteCount);
      } else {
        console.error('No result from upvote call');
      }
    } catch (error) {
      console.error('Error upvoting story:', error);
    } finally {
      setIsUpvoting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <div className="text-center mt-4">
          <Link to="/stories" className="btn btn-primary">Back to Stories</Link>
        </div>
      </div>
    );
  }
  
  if (!story) {
    return (
      <div className="page-container">
        <div className="alert alert-warning" role="alert">
          Story not found or you don't have access to it.
        </div>
        <div className="text-center mt-4">
          <Link to="/stories" className="btn btn-primary">Back to Stories</Link>
        </div>
      </div>
    );
  }
  
  const { title, content, englishContent, kanjiLevel, grammarLevel, createdAt, user: storyUser } = story;
  
  // Process content to handle possible null or undefined
  const contentParagraphs = content ? content.split('\n') : ['No content available.'];
  const englishParagraphs = englishContent ? englishContent.split('\n').filter(p => p.trim().length > 0) : [];
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return 'Unknown date';
      }
      
      // Format date with proper options
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Unknown date';
    }
  };
  
  // Check if current user is the story author
  const isAuthor = storyUser && user && storyUser.toString() === user._id;
  
  return (
    <div className="page-container">
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <Link to="/stories" className="btn btn-outline-primary">
          <i className="bi bi-arrow-left me-2"></i>Back to Stories
        </Link>
        <Link to={`/story-review/${id}`} className="btn btn-outline-secondary">
          <i className="bi bi-journal-text me-2"></i>View Grammar & Vocabulary
        </Link>
      </div>
      
      <section className="section fade-in">
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start">
              <h1 className="mb-3">{title}</h1>
              
              {/* Upvote button - only show if user isn't the author */}
              {!isAuthor && (
                <button 
                  className={`btn ${hasUpvoted ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={handleUpvote}
                  disabled={isUpvoting}
                >
                  <i className={`bi bi-hand-thumbs-up${hasUpvoted ? '-fill' : ''} me-1`}></i>
                  {upvoteCount} {upvoteCount === 1 ? 'upvote' : 'upvotes'}
                </button>
              )}
            </div>
            
            <div className="d-flex flex-wrap gap-3 mb-2">
              <div className="badge bg-primary p-2">
                <i className="bi bi-translate me-2"></i>
                Kanji Level: {kanjiLevel}
              </div>
              <div className="badge bg-secondary p-2">
                <i className="bi bi-pencil-square me-2"></i>
                Grammar Level: {grammarLevel}
              </div>
              <div className="badge bg-info p-2">
                <i className="bi bi-calendar-date me-2"></i>
                Created: {formatDate(createdAt)}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="section slide-up">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="story-content japanese-text">
              {contentParagraphs.length > 0 ? (
                contentParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))
              ) : (
                <p className="text-muted">No content available for this story.</p>
              )}
            </div>
            
            {/* English translation section - always visible */}
            <div className="mt-4 english-content">
              <h3 className="mb-3">English Translation</h3>
              {englishParagraphs.length > 0 ? (
                englishParagraphs.map((paragraph, index) => (
                  <p key={`en-${index}`} className="mb-3">{paragraph || ' '}</p>
                ))
              ) : isTranslating ? (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading translation...</span>
                  </div>
                  <h4>Generating English Translation...</h4>
                  <p className="text-muted">This may take a few moments. The translation will be saved for future use.</p>
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-muted">No translation available.</p>
                  {translationError && (
                    <div className="alert alert-danger mt-3" role="alert">
                      {translationError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Story; 
