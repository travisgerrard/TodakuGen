import { createContext, useState } from 'react';
import axios from 'axios';

const GrammarContext = createContext();

export const GrammarProvider = ({ children }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search grammar
  const searchGrammar = async (query, genkiChapter) => {
    try {
      setLoading(true);
      setError(null);

      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      };

      // Build query string
      const queryParams = new URLSearchParams();
      if (query) queryParams.append('query', query);
      if (genkiChapter) queryParams.append('genkiChapter', genkiChapter);

      const { data } = await axios.get(
        `/api/grammar?${queryParams.toString()}`,
        config
      );
      
      setSearchResults(data);
      setLoading(false);
      return data;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to search grammar');
      setLoading(false);
      throw error;
    }
  };

  return (
    <GrammarContext.Provider
      value={{
        searchResults,
        loading,
        error,
        searchGrammar,
      }}
    >
      {children}
    </GrammarContext.Provider>
  );
};

export default GrammarContext; 