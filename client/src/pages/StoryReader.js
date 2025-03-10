import { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import StoryContext from '../context/StoryContext';
import VocabContext from '../context/VocabContext';
import axios from 'axios';

const StoryReader = () => {
  const { id } = useParams();
  console.log('StoryReader component initializing with ID:', id);
  const { getStoryById, markStoryAsComplete, getStoryReview, translateStory } = useContext(StoryContext);
  const { markWordAsDifficult } = useContext(VocabContext);
  
  // Define showEnglish here at the TOP with other state variables
  const [showEnglish, setShowEnglish] = useState(false);
  
  // Story state
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  
  // Translation state
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  
  // Review state
  const [reviewData, setReviewData] = useState({ vocabulary: [], grammarPoints: [] });
  const [loadingReview, setLoadingReview] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [activeTab, setActiveTab] = useState('vocabulary');
  
  // Word selection state
  const [selectedText, setSelectedText] = useState('');
  const [showWordActions, setShowWordActions] = useState(false);
  const [wordPosition, setWordPosition] = useState({ x: 0, y: 0 });
  
  const isComponentMounted = useRef(true);
  
  // Log the state for debugging
  useEffect(() => {
    console.log('Story component mounted with ID:', id);
    console.log('Show English state:', showEnglish);
  }, [id, showEnglish]);
  
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
  
  // Fetch story data
  const fetchStory = useCallback(async () => {
    if (fetchAttempted) return;
    
    try {
      setLoading(true);
      setFetchAttempted(true);
      
      console.log(`Fetching story with ID: ${id}`);
      const storyData = await getStoryById(id);
      
      console.log('Fetched story data:', storyData);
      
      if (storyData && storyData.title && storyData.content) {
        setStory(storyData);
        setError('');
        
        // Also fetch review data
        fetchReviewData();
      } else {
        console.error('Invalid or missing story data');
        setError('Story not found or data is incomplete');
      }
    } catch (error) {
      console.error('Error fetching story:', error);
      setError('Failed to load story. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id, getStoryById, fetchAttempted]);
  
  // Fetch review data (vocabulary and grammar)
  const fetchReviewData = async () => {
    try {
      setLoadingReview(true);
      
      console.log(`Fetching review data for story: ${id}`);
      const data = await getStoryReview(id);
      
      if (data) {
        setReviewData({
          vocabulary: data.vocabulary || [],
          grammarPoints: data.grammarPoints || []
        });
      }
    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoadingReview(false);
    }
  };
  
  useEffect(() => {
    isComponentMounted.current = true;
    fetchStory();
    
    return () => {
      isComponentMounted.current = false;
    };
  }, [fetchStory]);
  
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text) {
      setSelectedText(text);
      
      // Get position for the word actions popup
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setWordPosition({
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY,
      });
      
      setShowWordActions(true);
    } else {
      setShowWordActions(false);
    }
  };
  
  const handleMarkAsDifficult = async () => {
    if (!selectedText) return;
    
    try {
      console.log(`Marking word as difficult: "${selectedText}"`);
      
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };
      
      // Search for the word in the vocabulary database with addIfNotFound option
      const searchResponse = await axios.get(
        `/api/vocabulary?query=${encodeURIComponent(selectedText)}&addIfNotFound=true`,
        config
      );
      
      if (searchResponse.data && searchResponse.data.length > 0) {
        // Use the first matching word
        const vocabularyItem = searchResponse.data[0];
        console.log('Found or created vocabulary item:', vocabularyItem);
        
        // Mark the found word as difficult
        const result = await markWordAsDifficult(vocabularyItem._id);
        setShowWordActions(false);
        
        if (result) {
          // Show feedback to user
          alert(`"${selectedText}" marked as difficult and added to your vocabulary list.`);
        } else {
          alert('Failed to mark word as difficult. Please try again.');
        }
      } else {
        // This should rarely happen now since we're adding words if not found
        console.log('No vocabulary item returned even with addIfNotFound');
        alert(`Unable to add "${selectedText}" to vocabulary. Please try again.`);
        setShowWordActions(false);
      }
    } catch (error) {
      console.error('Error marking word as difficult:', error.response?.data || error.message);
      alert('Failed to mark word as difficult. Please try again.');
      setShowWordActions(false);
    }
  };
  
  const handleCompleteStory = async () => {
    try {
      const result = await markStoryAsComplete(id);
      if (result) {
        setCompleted(true);
      }
    } catch (error) {
      console.error('Error marking story as complete:', error);
    }
  };
  
  const toggleReview = () => {
    setShowReview(!showReview);
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
  
  // Destructure with defaults to handle missing properties
  const { 
    title = 'Untitled Story',
    content = 'No content available.',
    englishContent = '',
    kanjiLevel = 'N/A',
    grammarLevel = 'N/A',
    topic = 'N/A',
    length = 'N/A'
  } = story;
  
  console.log('Story data loaded:', { 
    title, 
    contentLength: content?.length,
    englishContentLength: englishContent?.length,
    hasEnglishContent: Boolean(englishContent)
  });
  
  // Process content to handle possible null or undefined
  const safeContent = content || '';
  const contentParagraphs = typeof safeContent === 'string' 
    ? safeContent.split('\n') 
    : ['No content available.'];
    
  // Process English content
  const safeEnglishContent = englishContent || '';
  const englishParagraphs = typeof safeEnglishContent === 'string'
    ? safeEnglishContent.split('\n').filter(p => p.trim().length > 0)
    : [];
    
  console.log('Story has English content:', {
    hasContent: story?.englishContent ? true : false,
    contentLength: story?.englishContent?.length || 0,
    paragraphCount: englishParagraphs.length,
    showEnglish
  });
    
  // Show loading state
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading story...</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">{error}</div>
        <div className="mt-3">
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }
  
  // Show empty state if no story data
  if (!story) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning" role="alert">
          Story not found. Please try another story.
        </div>
        <div className="mt-3">
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }
  
  // At the end of the render return, OUTSIDE of any conditional rendering
  return (
    <div className="container py-4">
      <h1 className="mb-4">{title}</h1>
      
      <div className="story-info d-flex flex-wrap gap-3 mb-4 p-3 bg-light rounded">
        <div><strong>Kanji Level:</strong> {kanjiLevel}</div>
        <div><strong>Grammar Level:</strong> {grammarLevel}</div>
        <div><strong>Topic:</strong> {topic}</div>
        <div><strong>Length:</strong> {length}</div>
      </div>
      
      <div className="story-content mb-5" style={{ position: 'relative' }}>
        <div className="mb-4">
          {contentParagraphs.map((paragraph, index) => (
            <p 
              key={`jp-${index}`} 
              className="mb-3 japanese-text" 
              onMouseUp={handleTextSelection}
            >
              {paragraph || ' '}
            </p>
          ))}
          
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
        
        {showWordActions && (
          <div 
            className="word-actions-popup"
            style={{ 
              position: 'absolute', 
              left: `${wordPosition.x}px`, 
              top: `${wordPosition.y}px`,
              zIndex: 1000,
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
          >
            <button onClick={handleMarkAsDifficult} className="btn btn-sm btn-primary me-2">
              Mark as Difficult
            </button>
            <button onClick={() => setShowWordActions(false)} className="btn btn-sm btn-secondary">
              Cancel
            </button>
          </div>
        )}
      </div>
      
      <div className="d-flex justify-content-between mb-4 p-3 bg-light rounded" style={{ border: '1px solid #dee2e6', marginTop: '20px' }}>
        <div>
          <button 
            onClick={handleCompleteStory}
            disabled={completed}
            className="btn btn-success me-2"
          >
            {completed ? 'Completed!' : 'Mark as Complete'}
          </button>
          
          <Link to="/" className="btn btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
      
      {showReview && (
        <div className="card mb-4">
          <div className="card-header">
            <ul className="nav nav-tabs card-header-tabs">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'vocabulary' ? 'active' : ''}`}
                  onClick={() => setActiveTab('vocabulary')}
                >
                  Vocabulary
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'grammar' ? 'active' : ''}`}
                  onClick={() => setActiveTab('grammar')}
                >
                  Grammar
                </button>
              </li>
            </ul>
          </div>
          
          <div className="card-body">
            {loadingReview ? (
              <div className="text-center py-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading review data...</span>
                </div>
              </div>
            ) : activeTab === 'vocabulary' ? (
              <div className="vocabulary-section">
                <h3>Key Vocabulary</h3>
                {reviewData.vocabulary && reviewData.vocabulary.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Word</th>
                          <th>Reading</th>
                          <th>Meaning</th>
                          <th>Level</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewData.vocabulary.map((item, index) => {
                          // Handle both direct vocabulary objects and nested wordId objects
                          const word = item.wordId || item;
                          
                          // Skip if we don't have a valid word object
                          if (!word || (!word.word && !word._id)) {
                            console.log('Invalid vocabulary item:', item);
                            return null;
                          }
                          
                          return (
                            <tr key={word._id || `vocab-${index}`}>
                              <td>{word.word || 'Unknown'}</td>
                              <td>{word.reading || ''}</td>
                              <td>{word.meaning || ''}</td>
                              <td>N{word.kanjiLevel || 'A'}</td>
                              <td>
                                <button 
                                  onClick={() => markWordAsDifficult(word._id)}
                                  className="btn btn-sm btn-warning"
                                  disabled={!word._id}
                                >
                                  Mark as Difficult
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-info">
                    <p>No vocabulary analysis available for this story yet.</p>
                    <p>Visit the Story Review page to generate vocabulary analysis.</p>
                    <Link to={`/review/${id}`} className="btn btn-primary mt-2">
                      Go to Story Review
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grammar-section">
                <h3>Grammar Points</h3>
                {reviewData.grammarPoints && reviewData.grammarPoints.length > 0 ? (
                  <div className="accordion" id="grammarAccordion">
                    {reviewData.grammarPoints.map((point, index) => {
                      if (!point) {
                        return null;
                      }
                      
                      // Extract rule name properly
                      const ruleName = point.rule || (point.pattern ? `${point.pattern} - ${point.name}` : 'Unknown Grammar Point');
                      
                      return (
                        <div className="accordion-item" key={`grammar-${index}`}>
                          <h2 className="accordion-header">
                            <button 
                              className="accordion-button collapsed" 
                              type="button" 
                              data-bs-toggle="collapse" 
                              data-bs-target={`#grammar-collapse-${index}`}
                            >
                              {ruleName}
                            </button>
                          </h2>
                          <div 
                            id={`grammar-collapse-${index}`} 
                            className="accordion-collapse collapse"
                            data-bs-parent="#grammarAccordion"
                          >
                            <div className="accordion-body">
                              <p><strong>Level:</strong> Genki {point.genkiChapter || point.level || 'N/A'}</p>
                              <p><strong>Explanation:</strong> {point.explanation || point.usage || 'No explanation available'}</p>
                              
                              {point.commonMistakes && (
                                <p><strong>Common Mistakes:</strong> {point.commonMistakes}</p>
                              )}
                              
                              {point.similarPatterns && (
                                <p><strong>Similar Patterns:</strong> {point.similarPatterns}</p>
                              )}
                              
                              {(point.examples && point.examples.length > 0) ? (
                                <div>
                                  <p><strong>Examples:</strong></p>
                                  <ul className="list-group">
                                    {point.examples.map((ex, i) => (
                                      <li key={i} className="list-group-item">
                                        <p className="mb-1">{ex.sentence || ex.example}</p>
                                        <p className="text-muted mb-0">{ex.translation}</p>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                point.example && (
                                  <p><strong>Example:</strong> {point.example}<br/>
                                  <span className="text-muted">{point.translation}</span></p>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="alert alert-info">
                    <p>No grammar analysis available for this story yet.</p>
                    <p>Visit the Story Review page to generate grammar analysis.</p>
                    <Link to={`/review/${id}`} className="btn btn-primary mt-2">
                      Go to Story Review
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
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
                onClick={toggleReview}
                className="btn btn-info"
              >
                {showReview ? 'Hide Analysis' : 'Show Analysis'}
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

export default StoryReader; 