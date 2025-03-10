import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await login(username);
      navigate('/');
    } catch (err) {
      // Error handling is done in the AuthContext
      console.error('Login error:', err);
    }
  };

  return (
    <div className="auth-page fade-in">
      <div className="card auth-card shadow">
        <div className="auth-header">
          <div className="auth-logo">TadokuGen</div>
          <h1 className="h4">Log in to your account</h1>
          <p className="text-muted">Enter a username to get started</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              id="username"
              className="form-control"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 mb-3"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Logging in...
              </>
            ) : (
              'Login / Register'
            )}
          </button>
        </form>

        <div className="text-center mt-3">
          <p className="text-muted small">
            <i className="bi bi-info-circle me-1"></i>
            Just enter a username to login or create a new account
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 