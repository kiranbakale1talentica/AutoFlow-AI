// Environment configuration helper
module.exports = {
  PORT: process.env.PORT || 5000,
  DB_PATH: process.env.DB_PATH || './database.db',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // GitHub OAuth Configuration (REPLACE WITH YOUR ACTUAL VALUES)
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || 'Ov23liKzyBnmC5F7YSqD',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || 'e29d641719b5e8ca531e7c62826c97e65c089a3c',
  GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/auth/github/callback',
  
  // Session Configuration
  SESSION_SECRET: process.env.SESSION_SECRET || 'cicd-dashboard-secret-key-change-this-in-production',
  
  // Webhook Configuration
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'your_webhook_secret_for_github_verification'
};
