// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { initializeAssociations } = require('./models');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Initialize Express
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Add request logging
app.use((req, res, next) => {
  console.log(`[SERVER] ${req.method} ${req.url}`);
  next();
});

// Add these test routes BEFORE your other route declarations
app.get('/api/test', (req, res) => {
  res.json({ message: 'API test endpoint working' });
});

app.post('/api/auth/test', (req, res) => {
  res.json({ message: 'Auth test endpoint working', body: req.body });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users/me', require('./routes/authRoutes'));
app.use('/api/stories', require('./routes/storyRoutes'));
app.use('/api/words', require('./routes/wordRoutes'));
app.use('/api/vocab', require('./routes/wordRoutes'));
app.use('/api/grammar', require('./routes/grammarRoutes'));

// Root route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Connect to the database and start the server
const startServer = async () => {
  try {
    // Connect to PostgreSQL database
    await connectDB();
    
    // Initialize model associations
    initializeAssociations();
    
    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer(); 
