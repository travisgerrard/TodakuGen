import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, updateProfile, isLoading, error } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    
    try {
      await updateProfile({ username });
      setSuccess(true);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  return (
    <div className="page-container">
      <h1>Your Profile</h1>
      
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          {success && (
            <div className="alert alert-success" role="alert">
              Profile updated successfully!
            </div>
          )}
          
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row mb-3">
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="username" className="form-label">Username</label>
                  <input
                    type="text"
                    id="username"
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                'Update Profile'
              )}
            </button>
          </form>
        </div>
      </div>
      
      <div className="card shadow-sm">
        <div className="card-header">
          <h2 className="mb-0 h5">Account Information</h2>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p><strong>User ID:</strong> {user?._id}</p>
              <p><strong>Username:</strong> {user?.username}</p>
              <p><strong>Role:</strong> {user?.role || 'User'}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Account Created:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
              <p><strong>Reading Level:</strong> {user?.readingLevel || 'Not set'}</p>
              <p><strong>Words Marked as Difficult:</strong> {user?.difficultWords?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 