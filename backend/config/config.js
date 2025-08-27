require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  dbPath: process.env.DB_PATH || './database.db',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
};
