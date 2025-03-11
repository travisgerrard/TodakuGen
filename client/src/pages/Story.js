import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import StoryContext from '../context/StoryContext';

const Story = () => {
  const { id } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { translateStory } = useContext(StoryContext);
  
  // Translation state
  const [showEnglish, setShowEnglish] = useState(false);
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
  setError(null);
} catch (err) {
  console.error('Error fetching story:', err);
  console.error('Error response:', err.response?.data);
  setError('Failed to load the story. Please try again.');
} finally {
  setLoading(false);
}
    };
    
    fetchStory();
  }, [id]);
  
  // Request translation function
  const requestTranslation = async () => {
    if (!story || !id) {
      console.error('Cannot request translation: No story or story ID available');
      return;
    }

    // If we already have a translation, no need to request again
    if (story.englishContent && story.englishContent.length > 10) {
      console.log('Story already has translation, showing it');
      setShowEnglish(true);
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
        
        // Show the translation
        setShowEnglish(true);
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
  };
  
  const toggleEnglish = () => {
    console.log('Toggle English called, current state:', showEnglish);
    
    // If we don't have translation yet, request it
    if (!showEnglish && story && (!story.englishContent || story.englishContent.length < 10)) {
      console.log('No translation available, requesting one...');
      requestTranslation();
      return;
    }
    
    // Otherwise just toggle visibility
    setShowEnglish(prev => {
      console.log('Setting showEnglish to:', !prev);
      return !prev;
    });
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
  
  const { title, content, englishContent, kanjiLevel, grammarLevel, createdAt } = story;
  
  // Process content to handle possible null or undefined
  const contentParagraphs = content ? content.split('\n') : ['No content available.'];
  const englishParagraphs = englishContent ? englishContent.split('\n').filter(p => p.trim().length > 0) : [];
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
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
            <h1 className="mb-3">{title}</h1>
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
              {content ? (
                content.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))
              ) : (
                <p className="text-muted">No content available for this story.</p>
              )}
            </div>
            
            {showEnglish && (
              <div className="mt-4 english-translation">
                <h3 className="mb-3">English Translation</h3>
                {englishParagraphs.length > 0 ? (
                  <div className="card">
                    <div className="card-body">
                      {englishParagraphs.map((paragraph, index) => (
                        <p key={`en-${index}`} className="mb-3">{paragraph || ' '}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="card bg-light">
                    <div className="card-body text-center p-5">
                      <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading translation...</span>
                      </div>
                      <h4>Generating English Translation...</h4>
                      <p className="text-muted">This may take a few moments. The translation will be saved for future use.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* GUARANTEED VISIBLE TRANSLATION PANEL - Outside of all conditionals */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '0',
        right: '0',
        zIndex: '9999',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-block',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: '15px 25px',
          border: '3px solid #3498db',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div className="d-flex flex-column">
            {translationError && (
              <div className="alert alert-danger mb-3" role="alert">
                {translationError}
                <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => setTranslationError('')}>
                  Dismiss
                </button>
              </div>
            )}
            
            <div className="d-flex justify-content-center gap-3">
              <button
                onClick={toggleEnglish}
                className="btn btn-primary btn-lg"
                disabled={isTranslating}
                style={{
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  padding: '10px 20px'
                }}
              >
                {isTranslating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Translating...
                  </>
                ) : showEnglish ? 'Hide Translation' : 'Show Translation'}
              </button>
              
              <button
                onClick={() => {
                  console.log('Debug info:');
                  console.log('- Story:', story);
                  console.log('- Show English state:', showEnglish);
                  console.log('- English paragraphs:', englishParagraphs);
                  console.log('- Content length:', contentParagraphs.length);
                  console.log('- Is translating:', isTranslating);
                  alert('Debug info logged to console. Check the browser console.');
                }}
                className="btn btn-warning"
              >
                Debug
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Story; 
