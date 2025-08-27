# Technical Design Document - AutoFlow AI

## System Architecture Overview

AutoFlow AI follows a modern three-tier architecture with a React.js frontend, Node.js/Express.js backend, and SQLite database. The system is designed for scalability, maintainability, and real-time performance.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React.js)    │◄──►│  (Node.js/      │◄──►│   (SQLite)      │
│                 │    │   Express.js)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   GitHub API    │              │
         └──────────────►│   Integration   │──────────────┘
                        └─────────────────┘
```

## High-Level Architecture

### 1. Frontend Layer (React.js)

**Technology Stack:**
- React.js with functional components and hooks
- Material-UI (MUI) for component library
- Tailwind CSS for utility-first styling
- Recharts for data visualization
- Axios for API communication
- WebSocket for real-time updates

**Key Components:**
- Authentication context and protected routes
- Real-time dashboard with metrics
- Pipeline management interface
- Execution history and logs viewer
- Alert configuration panel
- GitHub integration components

### 2. Backend Layer (Node.js/Express.js)

**Technology Stack:**
- Node.js runtime environment
- Express.js web framework
- Passport.js for GitHub OAuth
- SQLite with sqlite3 driver
- WebSocket (ws) for real-time communication
- Nodemailer for email notifications

**Core Services:**
- Authentication and session management
- RESTful API endpoints
- Real-time WebSocket server
- GitHub API integration
- Email notification service
- Database abstraction layer

### 3. Data Layer (SQLite)

**Database Choice Rationale:**
- Lightweight and file-based for easy deployment
- ACID compliance for data integrity
- Sufficient performance for expected load
- Zero-configuration setup
- Easy backup and migration

### 4. External Integrations

**GitHub API Integration:**
- OAuth 2.0 authentication
- Repository and workflow access
- Webhook handling for real-time updates
- Rate limiting compliance

**Email Service Integration:**
- SMTP configuration for notifications
- Template-based email generation
- Delivery status tracking

## Detailed System Design

### Frontend Architecture

#### Component Hierarchy
```
App
├── AuthContext (Global Authentication State)
├── Layout
│   ├── Sidebar Navigation
│   ├── Header with User Profile
│   └── Main Content Area
├── Protected Routes
│   ├── Dashboard
│   │   ├── MetricsCard
│   │   ├── ChartsSection
│   │   └── RecentActivity
│   ├── Pipelines
│   │   ├── PipelineList
│   │   ├── PipelineForm
│   │   └── PipelineDetails
│   ├── Executions
│   │   ├── ExecutionHistory
│   │   └── ExecutionDetails
│   └── Alerts
│       ├── AlertConfig
│       └── NotificationCenter
└── LoginPage
```

#### State Management Strategy
- **React Context**: Global authentication state
- **Local State**: Component-specific data with useState
- **Real-time Updates**: WebSocket integration for live data
- **API Caching**: Axios interceptors for response caching

#### Routing Structure
```javascript
/ (Dashboard) - Protected Route
/login - Public Route
/pipelines - Protected Route
/pipelines/:id - Protected Route
/executions - Protected Route
/executions/:id - Protected Route
/alerts - Protected Route
/profile - Protected Route
/admin - Protected Route (Admin Only)
```

### Backend Architecture

#### Service Layer Design
```
Controllers (Route Handlers)
├── AuthController
├── PipelineController
├── ExecutionController
├── MetricsController
└── AlertController

Services (Business Logic)
├── AuthService
├── GitHubService
├── EmailService
├── SyncScheduler
└── WebhookHandler

Data Access Layer
├── DatabaseService
├── UserRepository
├── PipelineRepository
├── ExecutionRepository
└── AlertRepository

External Integrations
├── GitHub API Client
├── SMTP Email Client
└── WebSocket Server
```

#### API Design Pattern

**RESTful API Structure:**
- **Resource-based URLs**: `/api/pipelines`, `/api/executions`
- **HTTP Methods**: GET, POST, PUT, DELETE for CRUD operations
- **Status Codes**: Proper HTTP status codes for all responses
- **Error Handling**: Consistent error response format
- **Pagination**: Cursor-based pagination for large datasets

**API Response Format:**
```javascript
// Success Response
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [ ... ]
  }
}
```

## Database Schema Design

### Entity Relationship Diagram
```
Users ──┐
        │
        ├─ 1:N ─ Pipelines ──┐
        │                   │
        └─ 1:N ─ AlertConfigs│
                            │
                            ├─ 1:N ─ Executions
                            │
                            └─ 1:N ─ Notifications
```

### Detailed Table Schemas

#### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    access_token TEXT ENCRYPTED,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_email ON users(email);
```

#### Pipelines Table
```sql
CREATE TABLE pipelines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    repository_url TEXT NOT NULL,
    branch TEXT DEFAULT 'main',
    github_repository_id TEXT,
    github_workflow_id TEXT,
    github_webhook_id TEXT,
    is_active BOOLEAN DEFAULT 1,
    user_id INTEGER NOT NULL,
    last_execution_id INTEGER,
    last_sync_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (last_execution_id) REFERENCES executions (id)
);

-- Indexes
CREATE INDEX idx_pipelines_user_id ON pipelines(user_id);
CREATE INDEX idx_pipelines_github_repo ON pipelines(github_repository_id);
CREATE INDEX idx_pipelines_active ON pipelines(is_active);
```

#### Executions Table
```sql
CREATE TABLE executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id INTEGER NOT NULL,
    build_number INTEGER,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failure', 'stopped')),
    commit_hash TEXT,
    commit_message TEXT,
    commit_author TEXT,
    branch TEXT,
    build_time INTEGER, -- in seconds
    logs TEXT,
    github_run_id TEXT,
    github_workflow_id TEXT,
    triggered_by TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_executions_pipeline_id ON executions(pipeline_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_github_run ON executions(github_run_id);
CREATE INDEX idx_executions_created_at ON executions(created_at DESC);
```

#### Alert Configurations Table
```sql
CREATE TABLE alert_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('email', 'webhook')),
    event_types TEXT NOT NULL, -- JSON array: ['started', 'success', 'failure']
    email_address TEXT,
    webhook_url TEXT,
    is_enabled BOOLEAN DEFAULT 1,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_alert_configs_pipeline_id ON alert_configs(pipeline_id);
CREATE INDEX idx_alert_configs_user_id ON alert_configs(user_id);
```

#### Notifications Table
```sql
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_config_id INTEGER NOT NULL,
    execution_id INTEGER NOT NULL,
    notification_type TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at DATETIME,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_config_id) REFERENCES alert_configs (id) ON DELETE CASCADE,
    FOREIGN KEY (execution_id) REFERENCES executions (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_notifications_alert_config ON notifications(alert_config_id);
CREATE INDEX idx_notifications_execution ON notifications(execution_id);
CREATE INDEX idx_notifications_status ON notifications(status);
```

## API Structure and Routes

### Authentication Routes
```javascript
// GitHub OAuth
GET  /auth/github
GET  /auth/github/callback
GET  /api/auth/status
POST /api/auth/logout

// User Authentication (OTP-based)
POST /api/auth/login/request-otp
POST /api/auth/login/verify-otp
POST /api/auth/signup/request-otp
POST /api/auth/signup/verify-otp
```

### Pipeline Management Routes
```javascript
GET    /api/pipelines              // Get user's pipelines
POST   /api/pipelines              // Create new pipeline
GET    /api/pipelines/:id          // Get pipeline details
PUT    /api/pipelines/:id          // Update pipeline
DELETE /api/pipelines/:id          // Delete pipeline
POST   /api/pipelines/:id/sync     // Sync with GitHub
GET    /api/pipelines/:id/executions // Get pipeline executions
```

### Execution Tracking Routes
```javascript
GET  /api/executions               // Get execution history
POST /api/executions               // Create execution record
GET  /api/executions/:id           // Get execution details
PUT  /api/executions/:id           // Update execution status
```

### Metrics and Analytics Routes
```javascript
GET /api/metrics/dashboard         // Dashboard summary
GET /api/metrics/build-trends      // Build trend data
GET /api/metrics/success-rate      // Success rate analytics
GET /api/metrics/performance       // Performance metrics
```

### Alert Management Routes
```javascript
GET    /api/alerts/config          // Get alert configurations
POST   /api/alerts/config          // Create alert config
PUT    /api/alerts/config/:id      // Update alert config
DELETE /api/alerts/config/:id      // Delete alert config
POST   /api/alerts/test-email      // Test email functionality
```

### Sample API Responses

#### Get Pipelines Response
```javascript
{
  "success": true,
  "data": {
    "pipelines": [
      {
        "id": 1,
        "name": "sample-gh-pipeline",
        "description": "Sample GitHub Actions pipeline",
        "repository_url": "https://github.com/user/sample-repo",
        "branch": "main",
        "is_active": true,
        "last_execution": {
          "id": 123,
          "status": "success",
          "completed_at": "2024-01-15T10:30:00Z"
        },
        "execution_count": 28,
        "success_rate": 100,
        "created_at": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10
    }
  }
}
```

#### Dashboard Metrics Response
```javascript
{
  "success": true,
  "data": {
    "metrics": {
      "active_pipelines": 1,
      "total_executions": 28,
      "success_rate": 100,
      "avg_build_time": 6,
      "recent_executions": [
        {
          "id": 123,
          "pipeline_name": "sample-gh-pipeline",
          "status": "success",
          "build_time": 7,
          "completed_at": "2024-01-15T10:30:00Z"
        }
      ],
      "build_trends": [
        {
          "date": "2024-01-15",
          "builds": 5,
          "success": 5,
          "failure": 0,
          "avg_duration": 6.2
        }
      ]
    }
  }
}
```

## Real-time Communication Design

### WebSocket Implementation

#### Connection Management
```javascript
// Server-side WebSocket setup
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Client connection handling
wss.on('connection', (ws, req) => {
  // Authenticate WebSocket connection
  const user = authenticateWebSocket(req);
  
  // Store connection with user context
  connections.set(ws, { user, lastPing: Date.now() });
  
  // Handle incoming messages
  ws.on('message', (data) => {
    handleWebSocketMessage(ws, JSON.parse(data));
  });
});
```

#### Message Types
```javascript
// Pipeline status update
{
  "type": "pipeline_status",
  "data": {
    "pipeline_id": 1,
    "status": "running",
    "execution_id": 124,
    "timestamp": "2024-01-15T10:35:00Z"
  }
}

// Execution completion
{
  "type": "execution_complete",
  "data": {
    "execution_id": 124,
    "pipeline_id": 1,
    "status": "success",
    "build_time": 45,
    "timestamp": "2024-01-15T10:35:45Z"
  }
}

// System notification
{
  "type": "notification",
  "data": {
    "message": "Pipeline sync completed",
    "level": "info",
    "timestamp": "2024-01-15T10:36:00Z"
  }
}
```

## Security Design

### Authentication Security
- **GitHub OAuth 2.0**: Secure token-based authentication
- **Session Management**: Encrypted session storage with expiration
- **CSRF Protection**: Cross-site request forgery prevention
- **Rate Limiting**: API endpoint rate limiting

### Data Security
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy headers
- **Sensitive Data**: Encrypted storage of tokens and credentials

### API Security
- **HTTPS Enforcement**: SSL/TLS for all communications
- **CORS Configuration**: Restrictive cross-origin policies
- **Helmet Middleware**: Security headers for Express.js
- **Error Handling**: Secure error messages without information leakage

## Performance Optimization

### Frontend Optimization
- **Code Splitting**: Lazy loading of route components
- **Memoization**: React.memo for component optimization
- **Virtual Scrolling**: Efficient rendering of large lists
- **Bundle Optimization**: Webpack bundle analysis and optimization

### Backend Optimization
- **Database Indexing**: Strategic indexes for query performance
- **Connection Pooling**: Efficient database connection management
- **Caching**: In-memory caching for frequently accessed data
- **Compression**: GZIP compression for API responses

### Real-time Performance
- **WebSocket Optimization**: Efficient message broadcasting
- **Event Debouncing**: Reduced frequency of status updates
- **Connection Management**: Automatic cleanup of stale connections
- **Message Queuing**: Reliable message delivery with queuing

## Deployment Architecture

### Docker Configuration

#### Multi-stage Frontend Build
```dockerfile
# Frontend Dockerfile
FROM node:16-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
```

#### Backend Container
```dockerfile
# Backend Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

#### Docker Compose Orchestration
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    volumes:
      - backend_data:/app/data
      - backend_logs:/app/logs
    
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:5000

volumes:
  backend_data:
  backend_logs:
```

## Monitoring and Logging

### Application Logging
- **Structured Logging**: JSON-formatted log entries
- **Log Levels**: Debug, Info, Warn, Error categorization
- **Request Logging**: HTTP request/response logging with Morgan
- **Error Tracking**: Comprehensive error logging with stack traces

### Performance Monitoring
- **Response Time Monitoring**: API endpoint performance tracking
- **Database Query Monitoring**: Query execution time tracking
- **Memory Usage**: Application memory consumption monitoring
- **WebSocket Monitoring**: Real-time connection and message metrics

### Health Checks
```javascript
// Health check endpoint
GET /api/health
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "github_api": "available",
    "email_service": "configured"
  },
  "metrics": {
    "uptime": 86400,
    "memory_usage": "45MB",
    "active_connections": 12
  }
}
```

This technical design provides a comprehensive blueprint for implementing a scalable, secure, and maintainable CI/CD Pipeline Health Dashboard that meets modern development team requirements.
