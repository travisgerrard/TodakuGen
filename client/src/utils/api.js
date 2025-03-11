import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to handle authentication
api.interceptors.request.use(
  (config) => {
    // Get token from local storage
    const token = localStorage.getItem('token');
    
    // If token exists and Authorization header is not already set
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle session expiry or unauthorized access
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Clear token and redirect to login if necessary
      localStorage.removeItem('token');
      // Optionally redirect to login page or show a notification
    }
    
    return Promise.reject(error);
  }
);

export default api; 
