import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const GrammarList = () => {
  const { token } = useAuth();
  
  // Local state
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grammarPoints, setGrammarPoints] = useState([]);

  // Fetch all grammar points when the component mounts
  useEffect(() => {
    const fetchGrammarPoints = async () => {
      if (activeTab !== 'search') {
        try {
          setLoading(true);
          setError('');
          
          console.log('Fetching all grammar points');
          const response = await api.get('/grammar/all', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('Grammar points:', response.data);
          setGrammarPoints(response.data || []);
        } catch (err) {
          console.error('Error fetching grammar points:', err);
          setError('Failed to load grammar points');
          setGrammarPoints([]);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchGrammarPoints();
  }, [token, activeTab]);

  // Fetch grammar points when the search query changes
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      
      console.log(`Searching for grammar: "${searchQuery}"`);
      const response = await api.get(`/grammar/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Grammar search results:', response.data);
      setGrammarPoints(response.data || []);
    } catch (err) {
      console.error('Error searching grammar:', err);
      setError('Failed to search grammar points');
      setGrammarPoints([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, token]);

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

  return (
    <div className="page-container">
      <h1 className="mb-4">Grammar Points</h1>
      
      <div className="review-tabs mb-4">
        <button 
          className={`${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          <i className="bi bi-collection me-2"></i>
          All Grammar
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
                  placeholder="Search for grammar patterns or explanations"
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
      ) : grammarPoints.length > 0 ? (
        <div className="grammar-list">
          {grammarPoints.map(grammar => (
            <div key={grammar._id || `grammar-${Math.random()}`} className="grammar-item">
              <div className="grammar-header">
                <h3 className="mb-0 japanese-text">{grammar.pattern || grammar.rule || 'Unknown'}</h3>
              </div>
              <div className="grammar-body">
                <div className="mb-3">
                  <div className="fw-bold mb-1">Explanation:</div>
                  <div>{grammar.explanation || 'No explanation available'}</div>
                </div>
                
                {grammar.commonMistakes && (
                  <div className="mb-3">
                    <div className="fw-bold mb-1">Common Mistakes:</div>
                    <div className="p-2 bg-light rounded">{grammar.commonMistakes}</div>
                  </div>
                )}
                
                {grammar.similarPatterns && (
                  <div className="mb-3">
                    <div className="fw-bold mb-1">Similar Patterns:</div>
                    <div className="p-2 bg-light rounded">{grammar.similarPatterns}</div>
                  </div>
                )}
                
                {grammar.examples && grammar.examples.length > 0 && (
                  <div>
                    <div className="fw-bold mb-1">Example Sentences:</div>
                    <div className="example-list">
                      {grammar.examples.map((example, idx) => (
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
          ))}
        </div>
      ) : searchQuery ? (
        <div className="card text-center p-5">
          <i className="bi bi-emoji-frown text-muted mb-3" style={{ fontSize: '3rem' }}></i>
          <h3>No Grammar Points Found</h3>
          <p>No results match your search query. Try different keywords.</p>
        </div>
      ) : (
        <div className="card text-center p-5">
          <i className="bi bi-search text-muted mb-3" style={{ fontSize: '3rem' }}></i>
          <h3>No Grammar Points Found</h3>
          <p>There are no grammar points in the database yet.</p>
        </div>
      )}
    </div>
  );
};

export default GrammarList; 