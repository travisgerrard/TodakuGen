import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import '../styles/MobileNavigation.css';

const MobileNavigation = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <div className="mobile-navigation">
      <button 
        className={`hamburger ${isOpen ? 'open' : ''}`} 
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <h2>TadokuGen</h2>
          {isAuthenticated && user && (
            <p className="user-greeting">Hi, {user.username || user.name || 'User'}</p>
          )}
        </div>
        
        <nav className="mobile-nav-links">
          <Link to="/" onClick={closeMenu}>Home</Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/stories" onClick={closeMenu}>Stories</Link>
              <Link to="/vocabulary" onClick={closeMenu}>Vocabulary</Link>
              <Link to="/grammar" onClick={closeMenu}>Grammar</Link>
              <Link to="/difficult-words" onClick={closeMenu}>Difficult Words</Link>
              <Link to="/profile" onClick={closeMenu}>Profile</Link>
              <button 
                onClick={() => {
                  logout();
                  closeMenu();
                }} 
                className="mobile-logout-btn"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" onClick={closeMenu}>Login</Link>
          )}
        </nav>
        
        <div className="mobile-menu-footer">
          <p>&copy; {new Date().getFullYear()} TadokuGen</p>
        </div>
      </div>
      
      {/* Overlay to capture clicks outside menu */}
      {isOpen && (
        <div className="mobile-menu-overlay" onClick={closeMenu}></div>
      )}
    </div>
  );
};

export default MobileNavigation; 