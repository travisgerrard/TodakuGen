import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStory } from '../context/StoryContext';

const Stories = () => {
  const navigate = useNavigate();
  const { getUserStories, toggleStoryVisibility, isLoading, error } = useStory();
  const [stories, setStories] = useState([]);
  const [filter, setFilter] = useState('all');  // 'all', 'completed', 'inProgress'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'level', 'popular'
  const [reloadKey, setReloadKey] = useState(0); // Used to force refresh

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
  }, [getUserStories, reloadKey]);

  const handleToggleVisibility = async (storyId) => {
    const result = await toggleStoryVisibility(storyId);
    if (result) {
      // Update the story in the local state
      setStories(prevStories =>
        prevStories.map(story =>
          story._id === storyId
            ? { ...story, isPublic: result.isPublic }
            : story
        )
      );
    }
  };

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
        const levelA = a.kanjiLevel || 0;
        const levelB = b.kanjiLevel || 0;
        return levelA - levelB;
      });
    } else if (sortBy === 'popular') {
      filtered.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
    }
    
    return filtered;
  };

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

  return (
    <div className="page-container">
      <section className="section fade-in">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>My Stories</h1>
          <div>
            <Link to="/community" className="btn btn-outline-primary me-2">
              <i className="bi bi-people me-1"></i>
              Community Stories
            </Link>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/')}
            >
              <i className="bi bi-plus-circle me-1"></i>
              Create New Story
            </button>
          </div>
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
                  <option value="level">Level (Lowest First)</option>
                  <option value="popular">Most Upvoted</option>
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
                  <div className="d-flex justify-content-between align-items-start">
                    <h3 className="story-title">{story.title}</h3>
                    {story.isOwner && (
                      <button 
                        className="btn btn-sm btn-outline-secondary visibility-toggle"
                        onClick={() => handleToggleVisibility(story._id)}
                        title={story.isPublic ? "Make Private" : "Make Public"}
                      >
                        <i className={`bi bi-${story.isPublic ? 'globe' : 'lock'}`}></i>
                      </button>
                    )}
                  </div>

                  <div className="story-meta">
                    <span><i className="bi bi-calendar-date me-2"></i>{formatDate(story.createdAt)}</span>
                    <span><i className="bi bi-translate me-2"></i>Level: {story.kanjiLevel}</span>
                    <span><i className="bi bi-tag me-2"></i>{story.topic}</span>
                    {story.completed && (
                      <span className="text-success">
                        <i className="bi bi-check-circle-fill me-2"></i>Completed
                      </span>
                    )}
                    <span className="text-primary">
                      <i className="bi bi-hand-thumbs-up-fill me-2"></i>
                      {story.upvoteCount || 0} {story.upvoteCount === 1 ? 'upvote' : 'upvotes'}
                    </span>
                    {story.isPublic && (
                      <span className="text-info">
                        <i className="bi bi-globe me-2"></i>
                        Public
                      </span>
                    )}
                    {!story.isPublic && (
                      <span className="text-muted">
                        <i className="bi bi-lock me-2"></i>
                        Private
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
        ) :
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
        }
      </section>
    </div>
  );
};

export default Stories; 