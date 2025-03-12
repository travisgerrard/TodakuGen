import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStory } from '../context/StoryContext';
import { useAuth } from '../context/AuthContext';

const CommunityStories = () => {
  const navigate = useNavigate();
  const { getCommunityStories, upvoteStory, isLoading, error } = useStory();
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [filter, setFilter] = useState('popular'); // 'popular', 'recent', 'level'
  const [reloadKey, setReloadKey] = useState(0); // Used to force refresh

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const fetchedStories = await getCommunityStories();
        setStories(fetchedStories || []);
      } catch (err) {
        console.error('Error fetching community stories:', err);
      }
    };

    fetchStories();
  }, [getCommunityStories, reloadKey]);

  const handleUpvote = async (storyId) => {
    const result = await upvoteStory(storyId);
    if (result) {
      // Update local state to reflect changes
      setStories(prevStories => 
        prevStories.map(story => 
          story._id === storyId 
            ? { 
                ...story, 
                upvoteCount: result.upvoteCount,
                hasUpvoted: result.hasUpvoted
              } 
            : story
        )
      );
    }
  };

  const filteredStories = () => {
    if (!stories || stories.length === 0) return [];
    
    let filtered = [...stories];
    
    // Apply sorting based on filter
    if (filter === 'popular') {
      filtered.sort((a, b) => b.upvoteCount - a.upvoteCount);
    } else if (filter === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (filter === 'level') {
      filtered.sort((a, b) => a.kanjiLevel - b.kanjiLevel);
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
          <h1>Community Stories</h1>
          <div>
            <Link to="/stories" className="btn btn-outline-primary me-2">
              <i className="bi bi-journal-text me-1"></i>
              My Stories
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
                <label htmlFor="filter" className="form-label">Sort by:</label>
                <select 
                  id="filter"
                  className="form-control"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="popular">Most Popular</option>
                  <option value="recent">Most Recent</option>
                  <option value="level">Level (Lowest First)</option>
                </select>
              </div>
              <div className="col-md-6">
                <p className="mb-0 mt-md-4">
                  <i className="bi bi-info-circle me-2"></i>
                  These are public stories shared by the community
                </p>
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
                    <span>
                      <i className="bi bi-person me-2"></i>
                      {story.username || 'Anonymous'}
                    </span>
                    <span>
                      <i className="bi bi-calendar-date me-2"></i>
                      {formatDate(story.createdAt)}
                    </span>
                    <span>
                      <i className="bi bi-translate me-2"></i>
                      Level: {story.kanjiLevel}
                    </span>
                    <span>
                      <i className="bi bi-tag me-2"></i>
                      {story.topic}
                    </span>
                    {story.completed && (
                      <span className="text-success">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        You've read this
                      </span>
                    )}
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mt-3 mb-3">
                    <button 
                      className={`btn btn-sm ${story.hasUpvoted ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleUpvote(story._id)}
                    >
                      <i className={`bi bi-hand-thumbs-up${story.hasUpvoted ? '-fill' : ''} me-1`}></i>
                      {story.upvoteCount} {story.upvoteCount === 1 ? 'upvote' : 'upvotes'}
                    </button>
                    
                    <div className="story-level-badge">
                      <span className="story-tag">
                        <i className="bi bi-bar-chart-fill me-1"></i>
                        Kanji Level {story.kanjiLevel}
                      </span>
                    </div>
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
            <h3>No Community Stories Found</h3>
            <p>There are no public stories available from the community yet.</p>
            <button 
              className="btn btn-primary mt-3" 
              onClick={() => navigate('/')}
            >
              Create the First Community Story
            </button>
          </div>
        }
      </section>
    </div>
  );
};

export default CommunityStories; 