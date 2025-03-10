import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const DifficultWords = () => {
  const { token } = useAuth();
  const [difficultWords, setDifficultWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'withNotes', 'withoutNotes'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'alphabetical'
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWordId, setEditingWordId] = useState(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    const fetchDifficultWords = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/vocab/difficult', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDifficultWords(response.data || []);
        setError(null);
      } catch (err) {
        setError('Failed to load difficult words. Please try again later.');
        console.error('Error fetching difficult words:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDifficultWords();
  }, [token]);

  const filteredWords = () => {
    if (!difficultWords || difficultWords.length === 0) return [];
    
    let filtered = [...difficultWords];
    
    // Apply search filter if there is a search term
    if (searchTerm) {
      filtered = filtered.filter(word => 
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
        word.meaning.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply filter
    if (filter === 'withNotes') {
      filtered = filtered.filter(word => word.notes && word.notes.trim().length > 0);
    } else if (filter === 'withoutNotes') {
      filtered = filtered.filter(word => !word.notes || word.notes.trim().length === 0);
    }
    
    // Apply sorting
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
    } else if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.word.localeCompare(b.word));
    }
    
    return filtered;
  };

  const handleRemoveWord = async (wordId) => {
    if (window.confirm('Are you sure you want to remove this word from your difficult words?')) {
      try {
        await api.delete(`/vocab/difficult/${wordId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setDifficultWords(prevWords => prevWords.filter(word => word._id !== wordId));
      } catch (err) {
        console.error('Error removing word:', err);
        setError('Failed to remove word. Please try again.');
      }
    }
  };

  const startEditingNote = (word) => {
    setEditingWordId(word._id);
    setNoteText(word.notes || '');
  };

  const saveNote = async () => {
    if (!editingWordId) return;
    
    try {
      await api.put(`/vocab/difficult/${editingWordId}/notes`, { notes: noteText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDifficultWords(prevWords => 
        prevWords.map(word => 
          word._id === editingWordId 
            ? { ...word, notes: noteText } 
            : word
        )
      );
      
      setEditingWordId(null);
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="page-container">
      <section className="section fade-in">
        <h1>My Difficult Words</h1>
        <p className="lead mb-4">
          Words you've marked as difficult will appear here for review. Add your own notes to help remember them.
        </p>
        
        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label htmlFor="search" className="form-label">Search:</label>
                <input
                  type="text"
                  id="search"
                  className="form-control"
                  placeholder="Search words or meanings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label htmlFor="filter" className="form-label">Filter:</label>
                <select 
                  id="filter"
                  className="form-control"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Words</option>
                  <option value="withNotes">With Notes</option>
                  <option value="withoutNotes">Without Notes</option>
                </select>
              </div>
              <div className="col-md-4">
                <label htmlFor="sortBy" className="form-label">Sort by:</label>
                <select 
                  id="sortBy"
                  className="form-control"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section slide-up">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : filteredWords().length > 0 ? (
          <div className="row">
            {filteredWords().map((word) => (
              <div key={word._id} className="col-lg-6 mb-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h3 className="mb-0 japanese-text" style={{ fontSize: '1.5rem' }}>{word.word}</h3>
                    <div>
                      <button 
                        className="btn btn-sm btn-outline-danger ms-2" 
                        onClick={() => handleRemoveWord(word._id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <div className="mb-1 fw-bold">Reading:</div>
                      <div className="reading">{word.reading}</div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="mb-1 fw-bold">Meaning:</div>
                      <div>{word.meaning}</div>
                    </div>
                    
                    <div className="mb-3">
                      {editingWordId === word._id ? (
                        <div>
                          <label htmlFor={`note-${word._id}`} className="form-label fw-bold">Edit Note:</label>
                          <textarea
                            id={`note-${word._id}`}
                            className="form-control mb-2"
                            rows="3"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add your own notes about this word..."
                          ></textarea>
                          <div className="d-flex gap-2">
                            <button 
                              className="btn btn-sm btn-primary" 
                              onClick={saveNote}
                            >
                              Save
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-secondary" 
                              onClick={() => setEditingWordId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold">Notes:</span>
                            <button 
                              className="btn btn-sm btn-outline-primary" 
                              onClick={() => startEditingNote(word)}
                            >
                              <i className="bi bi-pencil"></i> Edit
                            </button>
                          </div>
                          <div className="p-2 bg-light rounded">
                            {word.notes ? word.notes : <em className="text-muted">No notes yet</em>}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {word.examples && word.examples.length > 0 && (
                      <div>
                        <div className="fw-bold mb-2">Example Sentences:</div>
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
                  <div className="card-footer text-muted">
                    <small>Added on {formatDate(word.dateAdded)}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center p-5">
            <i className="bi bi-bookmark-x text-muted mb-3" style={{ fontSize: '3rem' }}></i>
            <h3>No Difficult Words Found</h3>
            <p>You haven't marked any words as difficult yet, or none match your current filter.</p>
            <p className="mt-3">While reading stories, click on words to mark them as difficult.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default DifficultWords; 