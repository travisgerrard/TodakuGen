const { Sequelize } = require('sequelize');

// Log the database configuration
const dbConfig = {
  database: process.env.PG_DATABASE,
  username: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT
};

console.log('Database configuration:', {
  ...dbConfig,
  password: '******' // Hide the actual password in logs
});

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.PG_DATABASE,
  process.env.PG_USER,
  process.env.PG_PASSWORD,
  {
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected: Connection has been established successfully.');
    
    // In development, we might want to sync the models with the database
    if (process.env.NODE_ENV === 'development' && process.env.SYNC_DB === 'true') {
      console.log('Syncing database models...');
      // Using force:true during migration to ensure all tables are created
      await sequelize.sync({ force: true });
      console.log('Database models synced.');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB, sequelize }; 