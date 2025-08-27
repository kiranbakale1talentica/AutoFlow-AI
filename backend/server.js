const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const WebSocket = require('ws');
const http = require('http');
const session = require('express-session');
const passport = require('./config/passport');
const config = require('./config/config');
const Database = require('./models/database');
const database = new Database();
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const userAuthRoutes = require('./routes/userAuth');
const emailSettingsRoutes = require('./routes/email-settings');
const testEmailRoutes = require('./routes/test-email');
const { errorHandler } = require('./middleware/auth');
const syncScheduler = require('./services/syncScheduler');
const pipelinePollingService = require('./services/pipelinePollingService');
const notificationService = require('./services/notificationService');
const authService = require('./services/authService');
const createEmailSettingsTable = require('./models/migrations/create_email_settings');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie', 'Access-Control-Allow-Origin'],
  preflightContinue: true
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'cicd-dashboard-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for development (HTTP), true for production (HTTPS)
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  },
  name: 'autoflow_session'
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// WebSocket Server Setup
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket client connected');
  
  // Don't send automatic welcome message to avoid spam notifications
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Make WebSocket server available to routes
app.set('wss', wss);

// Set WebSocket server for polling service
pipelinePollingService.setWebSocketServer(wss);

// API routes
if (apiRoutes) app.use('/api', apiRoutes);
if (authRoutes) app.use('/auth', authRoutes);
if (userAuthRoutes) {
  console.log('🔐 Mounting user authentication routes...');
  const userAuthRouter = userAuthRoutes(authService);
  app.use('/api/auth', userAuthRouter);
  console.log('✅ User authentication routes mounted at /api/auth');
}
if (emailSettingsRoutes) app.use('/api', emailSettingsRoutes);
if (testEmailRoutes) app.use('/', testEmailRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CI/CD Pipeline Health Dashboard API',
    version: '1.0.0',
    features: ['WebSocket Support', 'Real-time Updates', 'Pipeline Management'],
    endpoints: {
      health: '/api/health',
      pipelines: '/api/pipelines',
      executions: '/api/executions',
      metrics: '/api/metrics/dashboard',
      buildTrends: '/api/metrics/build-trends',
      alerts: '/api/alerts/config',
      webhooks: {
        github: '/api/webhooks/github'
      }
    },
    websocket: `ws://localhost:${config.port}`
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    
    // Initialize authentication service
    await authService.initialize();
    
    // Create email settings table using existing database connection
    await createEmailSettingsTable(database);
    
    // Start HTTP server with WebSocket support
    server.listen(config.port, () => {
      console.log(`\n🚀 CI/CD Pipeline Health Dashboard API running on http://localhost:${config.port}`);
      console.log(`🔌 WebSocket server running on ws://localhost:${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🗄️  Database: ${config.dbPath}`);
      console.log(`🌐 CORS Origin: ${config.corsOrigin}`);
      console.log('\n📋 Available API endpoints:');
      console.log(`   🏠 GET  http://localhost:${config.port}/`);
      console.log(`   ❤️  GET  http://localhost:${config.port}/api/health`);
      console.log(`   🔧 GET  http://localhost:${config.port}/api/pipelines`);
      console.log(`   ▶️  GET  http://localhost:${config.port}/api/executions`);
      console.log(`   📊 GET  http://localhost:${config.port}/api/metrics/dashboard`);
      console.log(`   📈 GET  http://localhost:${config.port}/api/metrics/build-trends`);
      console.log(`   🔔 GET  http://localhost:${config.port}/api/alerts/config`);
      console.log(`   🪝 POST http://localhost:${config.port}/api/webhooks/github`);
      console.log(`   🔄 POST http://localhost:${config.port}/api/pipelines/:id/sync`);
      console.log('\n✅ CI/CD Dashboard Backend is ready for real-time monitoring!');
      
      // Start periodic sync scheduler (will only sync when tokens are available)
      console.log('🔄 Starting periodic execution sync...');
      syncScheduler.setDatabase(database);
      notificationService.setDatabase(database);
      syncScheduler.start();
      
      // Start pipeline polling service (will only poll when users connect GitHub)
      console.log('🔄 Starting pipeline polling service...');
      pipelinePollingService.setDatabase(database);
      pipelinePollingService.start();
      
      console.log('💡 Note: GitHub API polling will start when users connect their GitHub accounts');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  syncScheduler.stop();
  pipelinePollingService.stop();
  database.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  syncScheduler.stop();
  pipelinePollingService.stop();
  database.close();
  process.exit(0);
});

// Start the server
startServer();
