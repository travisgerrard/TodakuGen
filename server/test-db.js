require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log('Environment variables:');
console.log('PG_DATABASE:', process.env.PG_DATABASE);
console.log('PG_USER:', process.env.PG_USER);
console.log('PG_HOST:', process.env.PG_HOST);
console.log('PG_PORT:', process.env.PG_PORT);
console.log('SYNC_DB:', process.env.SYNC_DB);

const sequelize = new Sequelize(
  process.env.PG_DATABASE,
  process.env.PG_USER,
  process.env.PG_PASSWORD,
  {
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    dialect: 'postgres',
    logging: console.log
  }
);

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

testConnection(); 