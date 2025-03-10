import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoryProvider } from './context/StoryContext';
import { VocabProvider } from './context/VocabContext';
import { GrammarProvider } from './context/GrammarContext';

// Pages (to be created)
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Stories from './pages/Stories';
import StoryReader from './pages/StoryReader';
import StoryReview from './pages/StoryReview';
import VocabList from './pages/VocabList';
import GrammarList from './pages/GrammarList';
import Story from './pages/Story';
import DifficultWords from './pages/DifficultWords';

// Components (to be created)

function AppNavigation() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <header className="header">
      <div className="container d-flex justify-content-between align-items-center">
        <div className="logo">
          <Link to="/">
            <span>TadokuGen</span>
          </Link>
        </div>
        {isAuthenticated ? (
          <nav className="nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/stories" className="nav-link">Stories</Link>
            <Link to="/vocabulary" className="nav-link">Vocabulary</Link>
            <Link to="/grammar" className="nav-link">Grammar</Link>
            <Link to="/difficult-words" className="nav-link">Difficult Words</Link>
            <Link to="/profile" className="nav-link">Profile</Link>
            <span className="ms-2 text-muted">Hi, {user?.username || 'User'}</span>
            <button onClick={logout} className="btn-logout ms-2">
              <i className="bi bi-box-arrow-right me-1"></i>
              Logout
            </button>
          </nav>
        ) : (
          <nav className="nav">
            <Link to="/login" className="nav-link">Login</Link>
          </nav>
        )}
      </div>
    </header>
  );
}

// Protection wrapper for routes that require authentication
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <StoryProvider>
          <VocabProvider>
            <GrammarProvider>
              <div className="app-wrapper">
                <AppNavigation />
                <main className="app-container">
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Home />
                      </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } />
                    <Route path="/stories" element={
                      <ProtectedRoute>
                        <Stories />
                      </ProtectedRoute>
                    } />
                    <Route path="/story/:id" element={
                      <ProtectedRoute>
                        <Story />
                      </ProtectedRoute>
                    } />
                    <Route path="/story-review/:id" element={
                      <ProtectedRoute>
                        <StoryReview />
                      </ProtectedRoute>
                    } />
                    <Route path="/difficult-words" element={
                      <ProtectedRoute>
                        <DifficultWords />
                      </ProtectedRoute>
                    } />
                    <Route
                      path="/vocabulary"
                      element={
                        <ProtectedRoute>
                          <VocabList />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/grammar"
                      element={
                        <ProtectedRoute>
                          <GrammarList />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </main>
                <footer className="text-center p-4 text-muted">
                  <p className="mb-0">&copy; {new Date().getFullYear()} TadokuGen - Japanese Reading Practice Generator</p>
                </footer>
              </div>
            </GrammarProvider>
          </VocabProvider>
        </StoryProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
