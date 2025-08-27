# Backend - Node.js API Server

Express.js backend server providing RESTful API for CI/CD pipeline management and GitHub integration.

## Quick Start

```bash
cd backend
cp .env.example .env    # Configure environment variables
npm install
npm run dev
```

## API Structure

### Authentication
- `GET /auth/github` - GitHub OAuth login
- `GET /api/auth/status` - Check auth status
- `POST /api/auth/logout` - Logout

### Core Endpoints
- `GET /api/pipelines` - Pipeline management
- `GET /api/executions` - Execution tracking
- `GET /api/metrics/dashboard` - Dashboard data
- `GET /api/health` - Health check

## Environment Setup

Required variables in `.env`:
```bash
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SESSION_SECRET=your-secret-key
```

## Database

SQLite database with core tables:
- `users` - GitHub authenticated users
- `pipelines` - CI/CD pipeline configurations
- `executions` - Build execution records

## Services

- **AuthService** - GitHub OAuth and session management
- **GitHubService** - GitHub API integration
- **EmailService** - SMTP notifications
- **WebhookHandler** - Real-time GitHub updates

## Development

```bash
npm run dev     # Development with nodemon
npm start       # Production server
npm run setup   # Initialize database
```
