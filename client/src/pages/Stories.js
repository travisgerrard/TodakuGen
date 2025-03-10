import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStory } from '../context/StoryContext';

const Stories = () => {
  const navigate = useNavigate();
  const { getUserStories, isLoading, error } = useStory();
  const [stories, setStories] = useState([]);
  const [filter, setFilter] = useState('all');  // 'all', 'completed', 'inProgress'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'level'

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const fetchedStories = await getUserStories();
        setStories(fetchedStories || []);
      } catch (err) {
        console.error('Error fetching stories:', err);
      }
    };

    fetchStories();
  }, [getUserStories]);

  const filteredStories = () => {
    if (!stories || stories.length === 0) return [];
    
    let filtered = [...stories];
    
    // Apply filter
    if (filter === 'completed') {
      filtered = filtered.filter(story => story.completed);
    } else if (filter === 'inProgress') {
      filtered = filtered.filter(story => !story.completed);
    }
    
    // Apply sorting
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'level') {
      filtered.sort((a, b) => {
        const levelA = a.japaneseLevel || a.kanjiLevel;
        const levelB = b.japaneseLevel || b.kanjiLevel;
        return levelA.localeCompare(levelB);
      });
    }
    
    return filtered;
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="page-container">
      <section className="section fade-in">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>My Stories</h1>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/')}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Create New Story
          </button>
        </div>
        
        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <div className="row">
              <div className="col-md-6 mb-3 mb-md-0">
                <label htmlFor="filter" className="form-label">Filter:</label>
                <select 
                  id="filter"
                  className="form-control"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Stories</option>
                  <option value="completed">Completed</option>
                  <option value="inProgress">In Progress</option>
                </select>
              </div>
              <div className="col-md-6">
                <label htmlFor="sortBy" className="form-label">Sort by:</label>
                <select 
                  id="sortBy"
                  className="form-control"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="level">Level (Ascending)</option>
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
        ) : filteredStories().length > 0 ? (
          <div className="stories-grid">
            {filteredStories().map((story) => (
              <div key={story._id} className="story-card card">
                <div className="card-body d-flex flex-column">
                  <h3 className="story-title">{story.title}</h3>
                  <div className="story-meta">
                    <span><i className="bi bi-calendar-date me-2"></i>{formatDate(story.createdAt)}</span>
                    <span><i className="bi bi-translate me-2"></i>Level: {story.japaneseLevel || story.kanjiLevel}</span>
                    <span><i className="bi bi-tag me-2"></i>{story.topic}</span>
                    {story.completed && (
                      <span className="text-success">
                        <i className="bi bi-check-circle-fill me-2"></i>Completed
                      </span>
                    )}
                  </div>
                  <div className="story-actions mt-auto">
                    <Link to={`/story/${story._id}`} className="btn btn-primary flex-grow-1">
                      <i className="bi bi-book me-2"></i>Read
                    </Link>
                    <Link to={`/story-review/${story._id}`} className="btn btn-secondary flex-grow-1">
                      <i className="bi bi-journal-text me-2"></i>Review
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center p-5">
            <i className="bi bi-journal-x text-muted mb-3" style={{ fontSize: '3rem' }}></i>
            <h3>No Stories Found</h3>
            <p>You don't have any stories yet, or none match your current filter.</p>
            <button 
              className="btn btn-primary mt-3" 
              onClick={() => navigate('/')}
            >
              Generate Your First Story
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Stories; 