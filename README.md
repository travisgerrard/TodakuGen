# Tadoku-Style Japanese Reading App

A MERN stack application for Japanese language learners that generates personalized graded reading content using ChatGPT.

## Features

- **Personalized Reading Content**: Stories generated based on your WaniKani level and Genki textbook progress
- **Simplified Authentication**: Username-only login for easy access
- **Vocabulary Management**: Mark difficult words and review them later
- **Grammar Reference**: Search grammar points from your current level
- **Story Review**: Get breakdowns of vocabulary and grammar used in each story

## Tech Stack

- **MongoDB**: Database for user data, stories, and vocabulary/grammar
- **Express.js**: Backend API with ChatGPT integration
- **React**: Frontend user interface
- **Node.js**: JavaScript runtime
- **OpenAI API**: For generating Japanese stories tailored to your level

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- OpenAI API key

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd tadoku-app
   ```

2. Install backend dependencies
   ```
   cd server
   npm install
   ```

3. Install frontend dependencies
   ```
   cd ../client
   npm install
   ```

4. Set up environment variables
   - Create a `.env` file in the server directory with the following:
   ```
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/tadoku_app
   JWT_SECRET=your_jwt_secret
   OPENAI_API_KEY=your_openai_api_key
   ```

5. Seed the database with initial data
   ```
   cd ../server
   npm run data:import
   ```

### Running the Application

1. Start the development server (both frontend and backend)
   ```
   npm run dev
   ```

2. Access the application at `http://localhost:3000`

## Usage

1. **Login/Register**: Enter a username to get started
2. **Update Profile**: Set your WaniKani level and Genki chapter
3. **Generate Stories**: Create new reading content based on your level
4. **Read and Review**: Mark words as difficult and review grammar points
5. **Track Progress**: See your reading history and vocabulary growth

## Development Plan

### Phase 1: Core Functionality
- Basic authentication
- Story generation with ChatGPT
- Simple reading interface

### Phase 2: Enhanced Features
- Vocabulary and grammar tracking
- Review system
- User preferences

### Phase 3: Polish
- Improved story generation
- Audio narration (optional)
- WaniKani API integration (optional)

## License

ISC 