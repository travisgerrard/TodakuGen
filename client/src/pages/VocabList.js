import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const VocabList = () => {
  const { token, user } = useAuth();
  
  // Local state
  const [activeTab, setActiveTab] = useState('difficult');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [words, setWords] = useState([]);

  // Define the handleSearch function first so it can be referenced in useEffect
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      
      console.log(`Searching for: "${searchQuery}"`);
      const response = await api.get(`/vocab/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Search results:', response.data);
      setWords(response.data || []);
    } catch (err) {
      console.error('Error searching vocabulary:', err);
      setError('Failed to search vocabulary');
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, token]);

  // Fetch difficult words on component mount and when activeTab changes
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setError('Please log in to view vocabulary');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        if (activeTab === 'difficult') {
          console.log('Fetching difficult words');
          const response = await api.get('/vocab/difficult', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Received difficult words:', response.data);
          setWords(response.data || []);
        } else if (activeTab === 'search' && searchQuery) {
          await handleSearch();
        } else if (activeTab === 'all') {
          console.log('Fetching all vocabulary words');
          const response = await api.get('/vocab/all', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Received all vocabulary words:', response.data);
          setWords(response.data || []);
        }
      } catch (err) {
        console.error(`Error fetching ${activeTab} words:`, err);
        setError(`Failed to load ${activeTab} words`);
        setWords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token, activeTab, searchQuery, handleSearch]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'search') {
      setSearchQuery('');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const handleRemoveFromDifficult = async (wordId) => {
    try {
      if (!wordId) return;
      
      // Remove from difficult
      await api.delete(`/vocab/difficult/${wordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the list
      if (activeTab === 'difficult') {
        const updatedWords = words.filter(word => word._id !== wordId);
        setWords(updatedWords);
      }
      
      // Show feedback
      alert('Word removed from difficult list');
    } catch (err) {
      console.error('Error removing word from difficult list:', err);
      alert('Failed to remove word from difficult list');
    }
  };

  return (
    <div className="page-container">
      <h1 className="mb-4">Vocabulary</h1>
      
      <div className="review-tabs mb-4">
        <button 
          className={`${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          <i className="bi bi-collection me-2"></i>
          All Words
        </button>
        <button 
          className={`${activeTab === 'difficult' ? 'active' : ''}`}
          onClick={() => handleTabChange('difficult')}
        >
          <i className="bi bi-bookmark me-2"></i>
          Difficult Words
        </button>
        <button 
          className={`${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => handleTabChange('search')}
        >
          <i className="bi bi-search me-2"></i>
          Search
        </button>
      </div>
      
      {activeTab === 'search' && (
        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <form onSubmit={handleSearchSubmit}>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search for word in Japanese or English"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-search me-2"></i>
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : words.length > 0 ? (
        <div className="row">
          {words.map(word => (
            <div key={word._id || Math.random().toString()} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h3 className="mb-0 japanese-text">{word.word || 'Unknown'}</h3>
                  {activeTab === 'difficult' && (
                    <button 
                      onClick={() => handleRemoveFromDifficult(word._id)}
                      className="btn btn-sm btn-outline-danger"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  )}
                </div>
                <div className="card-body">
                  {word.reading && (
                    <div className="mb-3">
                      <div className="mb-1 fw-bold">Reading:</div>
                      <div className="reading">{word.reading}</div>
                    </div>
                  )}
                  <div className="mb-3">
                    <div className="mb-1 fw-bold">Meaning:</div>
                    <div>{word.meaning || 'No meaning available'}</div>
                  </div>
                  {word.notes && (
                    <div className="mb-3">
                      <div className="mb-1 fw-bold">Notes:</div>
                      <div className="p-2 bg-light rounded">{word.notes}</div>
                    </div>
                  )}
                  {word.examples && word.examples.length > 0 && (
                    <div>
                      <div className="fw-bold mb-1">Example Sentences:</div>
                      <div className="example-list">
                        {word.examples.map((example, idx) => (
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
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center p-5">
          <i className="bi bi-bookmark-x text-muted mb-3" style={{ fontSize: '3rem' }}></i>
          <h3>No Words Found</h3>
          {activeTab === 'difficult' ? (
            <p>No difficult words found. Mark words as difficult while reading stories.</p>
          ) : activeTab === 'all' ? (
            <p>No vocabulary words found in the database.</p>
          ) : (
            <p>No search results found. Try a different query.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default VocabList; 