import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StoryReview = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [story, setStory] = useState(null);
  const [storyContent, setStoryContent] = useState({title: '', content: '', kanjiLevel: '', grammarLevel: ''});
  const [activeTab, setActiveTab] = useState('vocabulary');

  // First, fetch the story basic data to get the title and levels
  useEffect(() => {
    const fetchStoryData = async () => {
      try {
        console.log(`Fetching basic story data for ID: ${id}`);
        const response = await api.get(`/stories/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Story basic data:', response.data);
        setStoryContent(response.data);
      } catch (err) {
        console.error('Error fetching story data:', err);
      }
    };
    
    fetchStoryData();
  }, [id, token]);

  // Then fetch the review data (vocabulary and grammar)
  useEffect(() => {
    const fetchStoryReview = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching review data for story ID: ${id}`);
        const response = await api.get(`/stories/${id}/review`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Review data response:', response.data);
        
        // Process and normalize the data structure
        const reviewData = response.data;
        
        // Handle the nested structure - some vocabulary items might be in a wordId property
        if (reviewData.vocabulary) {
          reviewData.vocabulary = reviewData.vocabulary.map(item => {
            if (item.wordId) {
              // If the vocabulary item is in a wordId property, extract it
              return {
                ...item.wordId,
                isDifficult: item.isDifficult || false
              };
            }
            return item;
          });
        }
        
        // Handle different grammar point formats
        const grammarData = reviewData.grammarPoints || reviewData.grammar || [];
        if (grammarData.length > 0) {
          reviewData.grammar = grammarData.map(item => {
            if (item.grammarId) {
              // If the grammar item is in a grammarId property, extract it
              return item.grammarId;
            }
            return item;
          });
        }
        
        console.log('Processed review data:', reviewData);
        setStory(reviewData);
      } catch (err) {
        console.error('Error fetching story review:', err);
        setError('Failed to load the story review. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStoryReview();
  }, [id, token]);

  const markAsDifficult = async (vocabId) => {
    try {
      console.log(`Marking vocabulary ID ${vocabId} as difficult`);
      await api.post(`/vocab/difficult/${vocabId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the UI to show the word has been marked as difficult
      setStory(prevStory => {
        if (!prevStory || !prevStory.vocabulary) return prevStory;
        
        return {
          ...prevStory,
          vocabulary: prevStory.vocabulary.map(vocab => 
            vocab._id === vocabId ? { ...vocab, isDifficult: true } : vocab
          )
        };
      });
      
    } catch (err) {
      console.error('Error marking word as difficult:', err);
      setError('Failed to mark word as difficult. Please try again.');
    }
  };

  const renderDebugInfo = () => {
    if (!story) return null;
    
    const vocabCount = (story.vocabulary || []).length;
    const grammarCount = ((story.grammar || story.grammarPoints || []).length);
    
    return (
      <div className="mb-3 p-3 bg-light border rounded">
        <h6>Debug Info:</h6>
        <ul className="mb-0">
          <li>Story ID: {id}</li>
          <li>Title: {storyContent?.title || 'N/A'}</li>
          <li>Vocabulary items: {vocabCount}</li>
          <li>Grammar items: {grammarCount}</li>
          <li>Data structure: {JSON.stringify(Object.keys(story))}</li>
          <li>Vocabulary sample: {vocabCount > 0 ? JSON.stringify(story.vocabulary[0].word || 'N/A') : 'None'}</li>
        </ul>
      </div>
    );
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
          Story review not found. It may have been deleted or you don't have access to it.
        </div>
        <div className="text-center mt-4">
          <Link to="/stories" className="btn btn-primary">Back to Stories</Link>
        </div>
      </div>
    );
  }

  // Extract and normalize the data with appropriate fallbacks
  const { title, kanjiLevel, grammarLevel } = storyContent;
  const vocabulary = story.vocabulary || [];
  const grammarItems = story.grammar || story.grammarPoints || [];

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link to={`/story/${id}`} className="btn btn-outline-primary">
          <i className="bi bi-arrow-left me-2"></i>Back to Story
        </Link>
      </div>
      
      <section className="section fade-in">
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h1 className="mb-3">{title || 'Untitled Story'}</h1>
            <div className="d-flex flex-wrap gap-3 mb-2">
              <div className="badge bg-primary p-2">
                <i className="bi bi-translate me-2"></i>
                Kanji Level: {kanjiLevel || 'Unknown'}
              </div>
              <div className="badge bg-secondary p-2">
                <i className="bi bi-pencil-square me-2"></i>
                Grammar Level: {grammarLevel || 'Unknown'}
              </div>
            </div>
            
            {renderDebugInfo()}
          </div>
        </div>
      </section>
      
      <section className="section slide-up">
        <div className="review-tabs">
          <button 
            className={`${activeTab === 'vocabulary' ? 'active' : ''}`}
            onClick={() => setActiveTab('vocabulary')}
          >
            <i className="bi bi-book me-2"></i>
            Vocabulary ({vocabulary.length})
          </button>
          <button 
            className={`${activeTab === 'grammar' ? 'active' : ''}`}
            onClick={() => setActiveTab('grammar')}
          >
            <i className="bi bi-list-check me-2"></i>
            Grammar ({grammarItems.length})
          </button>
        </div>
        
        <div className="card shadow-sm">
          <div className="card-body">
            {activeTab === 'vocabulary' && (
              <div className="vocab-list">
                {vocabulary.length > 0 ? (
                  vocabulary.map((vocab) => (
                    <div key={vocab._id || `vocab-${Math.random()}`} className="vocab-item">
                      <div className="vocab-header">
                        <div className="d-flex align-items-center">
                          <h3 className="mb-0 japanese-text me-2">{vocab.word || 'Unknown'}</h3>
                          <span className="reading">({vocab.reading || ''})</span>
                        </div>
                        <div>
                          {vocab.isDifficult ? (
                            <span className="badge bg-warning p-2">Marked as Difficult</span>
                          ) : (
                            <button 
                              className="btn btn-sm btn-outline-warning" 
                              onClick={() => markAsDifficult(vocab._id)}
                              disabled={!vocab._id}
                            >
                              <i className="bi bi-bookmark-plus me-1"></i>
                              Mark as Difficult
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="vocab-body">
                        <div className="mb-3">
                          <div className="fw-bold mb-1">Meaning:</div>
                          <div>{vocab.meaning || 'No meaning available'}</div>
                        </div>
                        
                        {vocab.notes && (
                          <div className="mb-3">
                            <div className="fw-bold mb-1">Notes:</div>
                            <div className="p-2 bg-light rounded">{vocab.notes}</div>
                          </div>
                        )}
                        
                        {vocab.examples && vocab.examples.length > 0 && (
                          <div>
                            <div className="fw-bold mb-1">Example Sentences:</div>
                            <div className="example-list">
                              {vocab.examples.map((example, idx) => (
                                <div key={idx} className="example-item">
                                  <div className="example-sentence">{example.sentence}</div>
                                  <div className="example-translation">{example.translation}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Support older API format with exampleSentences */}
                        {vocab.exampleSentences && vocab.exampleSentences.length > 0 && (
                          <div>
                            <div className="fw-bold mb-1">Example Sentences:</div>
                            <div className="example-list">
                              {vocab.exampleSentences.map((example, idx) => (
                                <div key={idx} className="example-item">
                                  <div className="example-sentence">{example.sentence}</div>
                                  <div className="example-translation">{example.translation}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4">
                    <i className="bi bi-emoji-frown text-muted mb-3" style={{ fontSize: '2rem' }}></i>
                    <h3>No Vocabulary</h3>
                    <p>This story doesn't have any vocabulary items to review.</p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'grammar' && (
              <div className="grammar-list">
                {grammarItems.length > 0 ? (
                  grammarItems.map((item) => (
                    <div key={item._id || `grammar-${Math.random()}`} className="grammar-item">
                      <div className="grammar-header">
                        <h3 className="mb-0 japanese-text">{item.pattern || item.rule || 'Unknown'}</h3>
                      </div>
                      <div className="grammar-body">
                        <div className="mb-3">
                          <div className="fw-bold mb-1">Explanation:</div>
                          <div>{item.explanation || 'No explanation available'}</div>
                        </div>
                        
                        {item.commonMistakes && (
                          <div className="mb-3">
                            <div className="fw-bold mb-1">Common Mistakes:</div>
                            <div className="p-2 bg-light rounded">{item.commonMistakes}</div>
                          </div>
                        )}
                        
                        {item.similarPatterns && (
                          <div className="mb-3">
                            <div className="fw-bold mb-1">Similar Patterns:</div>
                            <div className="p-2 bg-light rounded">{item.similarPatterns}</div>
                          </div>
                        )}
                        
                        {item.examples && item.examples.length > 0 && (
                          <div>
                            <div className="fw-bold mb-1">Example Sentences:</div>
                            <div className="example-list">
                              {item.examples.map((example, idx) => (
                                <div key={idx} className="example-item">
                                  <div className="example-sentence">{example.sentence}</div>
                                  <div className="example-translation">{example.translation}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4">
                    <i className="bi bi-emoji-frown text-muted mb-3" style={{ fontSize: '2rem' }}></i>
                    <h3>No Grammar Points</h3>
                    <p>This story doesn't have any grammar points to review.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default StoryReview; 