import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Custom hook for using AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenExpiryTime, setTokenExpiryTime] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Parse JWT token to get expiry time
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  };

  // Set token with expiry calculation
  const setAuthToken = (token) => {
    if (token) {
      localStorage.setItem('token', token);
      
      const decodedToken = parseJwt(token);
      if (decodedToken && decodedToken.exp) {
        // exp is in seconds, convert to milliseconds
        const expiryTime = new Date(decodedToken.exp * 1000);
        setTokenExpiryTime(expiryTime);
        console.log(`Token will expire at: ${expiryTime.toLocaleString()}`);
      }
      
      // Set axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setTokenExpiryTime(null);
    }
  };

  // Check if token is close to expiring (within 30 minutes)
  const isTokenExpiringSoon = () => {
    if (!tokenExpiryTime) return false;
    
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);
    return tokenExpiryTime < thirtyMinutesFromNow;
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (refreshing) return;
    
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setUser(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      console.log('Refreshing user data...');
      const { data } = await axios.get('/api/auth/me', config);
      setUser(data);
      setError(null);
    } catch (error) {
      console.error('Authentication refresh error:', error);
      
      // During migration: Be more lenient with errors to prevent lockouts
      if (error.response && 
          (error.response.status === 401 || error.response.status === 403) && 
          !error.response.data?.message?.includes('migration')) {
        console.log('Token is invalid or expired - clearing authentication');
        logout();
      } else if (error.message?.includes('invalid input syntax') || 
                 error.message?.includes('does not exist')) {
        console.log('Database migration error detected - keeping user logged in');
        // Don't change the user state or logout
      } else {
        setError('Authentication refresh failed');
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        // Parse token to check expiry
        const decodedToken = parseJwt(token);
        
        if (decodedToken && decodedToken.exp) {
          const expiryTime = new Date(decodedToken.exp * 1000);
          setTokenExpiryTime(expiryTime);
          
          // If token is expired, clear it
          if (expiryTime < new Date()) {
            console.log('Token has expired - clearing authentication');
            localStorage.removeItem('token');
            setUser(null);
            setLoading(false);
            return;
          }
        }
        
        setAuthToken(token);
        
        try {
          const config = {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          };

          const { data } = await axios.get('/api/auth/me', config);
          setUser(data);
          setError(null);
        } catch (error) {
          console.error('Authentication error:', error);
          
          // During migration: Be more lenient with errors to prevent lockouts
          // Only clear authentication for specific errors, not database migration issues
          if (error.response && 
              (error.response.status === 401 || error.response.status === 403) && 
              !error.response.data?.message?.includes('migration')) {
            console.log('Token is invalid - clearing authentication');
            localStorage.removeItem('token');
            setUser(null);
          } else if (error.message?.includes('invalid input syntax') || 
                     error.message?.includes('does not exist')) {
            console.log('Database migration error detected - attempting to handle gracefully');
            // Keep the token but show a minimal user object
            setUser({
              username: 'User', // Generic username
              waniKaniLevel: 1,
              genkiChapter: 1,
              preferences: {
                storyLength: 'medium',
                maxKanjiLevel: 5,
                maxGrammarLevel: 3,
                topics: ['daily life', 'school', 'travel']
              }
            });
          } else {
            setError('Authentication failed');
          }
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
    
    // Set up periodic refresh of user data every 15 minutes
    const refreshInterval = setInterval(() => {
      if (user && isTokenExpiringSoon()) {
        console.log('Token is expiring soon - refreshing user data');
        refreshUserData();
      }
    }, 15 * 60 * 1000); // 15 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Login user
  const login = async (username) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.post('/api/auth/login', { username });
      
      if (data && data.token) {
        setAuthToken(data.token);
        setUser(data);
        setError(null);
        return data;
      } else {
        throw new Error('Login response missing token');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (username) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.post('/api/auth/register', { username });
      
      if (data && data.token) {
        setAuthToken(data.token);
        setUser(data);
        setError(null);
        return data;
      } else {
        throw new Error('Registration response missing token');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const { data } = await axios.put('/api/auth/me', userData, config);
      
      // Update token if a new one is returned
      if (data && data.token) {
        setAuthToken(data.token);
      }
      
      setUser(data);
      setError(null);
      return data;
    } catch (error) {
      console.error('Profile update error:', error);
      
      // If we get a 401 or 403, clear authentication
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.log('Token is invalid during profile update - clearing authentication');
        logout();
      }
      
      setError(error.response?.data?.message || 'Failed to update profile');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoading: loading,
        error,
        isAuthenticated: !!user,
        token: localStorage.getItem('token'),
        tokenExpiryTime,
        login,
        register,
        logout,
        updateProfile,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 