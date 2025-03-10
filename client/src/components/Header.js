import { useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Header = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="header">
      <div className="container">
        <div className="logo">
          <Link to="/">TadokuGen</Link>
        </div>
        <nav className="nav">
          {user ? (
            <>
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/stories" className="nav-link">Stories</Link>
              <Link to="/vocabulary" className="nav-link">Vocabulary</Link>
              <Link to="/grammar" className="nav-link">Grammar</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <button onClick={logout} className="nav-link btn-logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header; 