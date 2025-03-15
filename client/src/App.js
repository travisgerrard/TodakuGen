import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoryProvider } from './context/StoryContext';
import { VocabProvider } from './context/VocabContext';
import { GrammarProvider } from './context/GrammarContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Pages (to be created)
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Stories from './pages/Stories';
import CommunityStories from './pages/CommunityStories';
import StoryReader from './pages/StoryReader';
import StoryReview from './pages/StoryReview';
import VocabList from './pages/VocabList';
import GrammarList from './pages/GrammarList';
import Story from './pages/Story';
import DifficultWords from './pages/DifficultWords';

// Components (to be created)
import ThemeToggle from './components/ThemeToggle';
import MobileNavigation from './components/MobileNavigation';

// Import the MigrationNotice component
import MigrationNotice from './components/MigrationNotice';

function AppNavigation() {
  const { isAuthenticated, logout, user } = useAuth();
  const { theme } = useTheme();

  return (
    <header className="header">
      <div className="container d-flex justify-content-between align-items-center">
        <div className="logo">
          <Link to="/">
            <span>TadokuGen</span>
          </Link>
        </div>
        
        {/* Desktop Navigation - Only shown on desktop */}
        <div className="desktop-nav">
          {isAuthenticated ? (
            <nav className="nav">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/stories" className="nav-link">My Stories</Link>
              <Link to="/community" className="nav-link">Community</Link>
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
          
          {/* Theme Toggle for Desktop */}
          <div className="desktop-theme-toggle">
            <ThemeToggle />
          </div>
        </div>
        
        {/* Mobile Navigation - Only shown on mobile */}
        <MobileNavigation />
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
      <ThemeProvider>
        <AuthProvider>
          <StoryProvider>
            <VocabProvider>
              <GrammarProvider>
                <div className="app-wrapper">
                  {/* Add the migration notice at the top */}
                  <MigrationNotice />
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
                      <Route path="/community" element={
                        <ProtectedRoute>
                          <CommunityStories />
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
                  
                  {/* Footer */}
                  <footer className="text-center p-4 text-muted">
                    <p className="mb-0">&copy; {new Date().getFullYear()} TadokuGen - Japanese Reading Practice Generator</p>
                  </footer>
                  
                  {/* Floating Theme Toggle for Mobile */}
                  <div className="floating-theme-toggle">
                    <ThemeToggle />
                  </div>
                </div>
              </GrammarProvider>
            </VocabProvider>
          </StoryProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
