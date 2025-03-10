import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStory } from '../context/StoryContext';

const Home = () => {
  const navigate = useNavigate();
  const { generateStory, isLoading, error } = useStory();
  const [formData, setFormData] = useState({
    topic: '',
    japaneseLevel: 'N5',
    waniKaniLevel: '1',
    genkiChapter: '1',
    length: 'medium',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const storyId = await generateStory(formData);
      
      // Only navigate if we have a valid story ID
      if (storyId) {
        console.log(`Story generated successfully, navigating to: /story/${storyId}`);
        navigate(`/story/${storyId}`);
      } else {
        console.error('No story ID returned from generation');
        // Handle the error in the UI as needed
      }
    } catch (err) {
      console.error('Error generating story:', err);
      // Error is already handled by the context, no need for additional handling here
    }
  };

  return (
    <div className="page-container">
      <section className="section fade-in">
        <div className="row mb-5">
          <div className="col-md-7">
            <h1>Welcome to TadokuGen</h1>
            <p className="lead mb-4">
              Generate Japanese reading practice materials tailored to your skill level. Improve your reading comprehension with personalized stories and vocabulary.
            </p>
            <div className="d-flex gap-3 mb-4">
              <button onClick={() => navigate('/stories')} className="btn btn-outline-primary">
                <i className="bi bi-book me-2"></i>My Stories
              </button>
              <button onClick={() => navigate('/difficult-words')} className="btn btn-outline-primary">
                <i className="bi bi-bookmark-star me-2"></i>My Vocabulary
              </button>
            </div>
          </div>
          <div className="col-md-5">
            <div className="card h-100 shadow-sm">
              <div className="card-body d-flex align-items-center">
                <div className="text-center w-100">
                  <i className="bi bi-journal-text text-primary" style={{ fontSize: '3rem' }}></i>
                  <h3 className="mt-3">Learn Japanese Through Reading</h3>
                  <p className="text-muted">Powerful AI generates content matched to your level</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section slide-up">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-primary text-white">
            <h2 className="mb-0">Generate a New Story</h2>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label htmlFor="topic" className="form-label">Story Topic or Theme</label>
                <input
                  type="text"
                  id="topic"
                  name="topic"
                  className="form-control"
                  placeholder="e.g., School, Travel, Food, etc."
                  value={formData.topic}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="japaneseLevel" className="form-label">Japanese Level</label>
                <select
                  id="japaneseLevel"
                  name="japaneseLevel"
                  className="form-control"
                  value={formData.japaneseLevel}
                  onChange={handleChange}
                >
                  <option value="N5">N5 (Beginner)</option>
                  <option value="N4">N4 (Basic)</option>
                  <option value="N3">N3 (Intermediate)</option>
                  <option value="N2">N2 (Upper Intermediate)</option>
                  <option value="N1">N1 (Advanced)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="waniKaniLevel" className="form-label">WaniKani Level</label>
                <select
                  id="waniKaniLevel"
                  name="waniKaniLevel"
                  className="form-control"
                  value={formData.waniKaniLevel}
                  onChange={handleChange}
                >
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4</option>
                  <option value="5">Level 5</option>
                  <option value="6">Level 6</option>
                  <option value="10">Level 10</option>
                  <option value="15">Level 15</option>
                  <option value="20">Level 20</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="genkiChapter" className="form-label">Genki Chapter</label>
                <select
                  id="genkiChapter"
                  name="genkiChapter"
                  className="form-control"
                  value={formData.genkiChapter}
                  onChange={handleChange}
                >
                  <option value="1">Chapter 1</option>
                  <option value="2">Chapter 2</option>
                  <option value="3">Chapter 3</option>
                  <option value="4">Chapter 4</option>
                  <option value="5">Chapter 5</option>
                  <option value="6">Chapter 6</option>
                  <option value="7">Chapter 7</option>
                  <option value="8">Chapter 8</option>
                  <option value="9">Chapter 9</option>
                  <option value="10">Chapter 10</option>
                  <option value="11">Chapter 11</option>
                  <option value="12">Chapter 12</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="length" className="form-label">Story Length</label>
                <select
                  id="length"
                  name="length"
                  className="form-control"
                  value={formData.length}
                  onChange={handleChange}
                >
                  <option value="short">Short (1-2 paragraphs)</option>
                  <option value="medium">Medium (3-4 paragraphs)</option>
                  <option value="long">Long (5-6 paragraphs)</option>
                </select>
              </div>
              
              <div className="form-group d-flex align-items-end">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-magic me-2"></i>Generate Story
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="section mt-5">
        <div className="row">
          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body text-center">
                <i className="bi bi-translate text-primary mb-3" style={{ fontSize: '2.5rem' }}></i>
                <h3>Vocabulary Building</h3>
                <p>Mark challenging words while reading to build your personalized vocabulary list.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body text-center">
                <i className="bi bi-pencil-square text-primary mb-3" style={{ fontSize: '2.5rem' }}></i>
                <h3>Grammar Notes</h3>
                <p>Each story comes with grammar explanations to help improve your Japanese structure.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body text-center">
                <i className="bi bi-graph-up text-primary mb-3" style={{ fontSize: '2.5rem' }}></i>
                <h3>Progressive Learning</h3>
                <p>Content adapts to your level, growing more complex as your skills improve.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 