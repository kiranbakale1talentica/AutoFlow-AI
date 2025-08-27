# Setup Guide - AutoFlow AI

This guide will help you set up the AutoFlow AI CI/CD Pipeline Health Dashboard from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 16+** - [Download from nodejs.org](https://nodejs.org/)
- **Docker & Docker Compose** - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download from git-scm.com](https://git-scm.com/)
- **GitHub Account** - For OAuth integration

## Quick Start (Recommended)

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd AutoFlow-AI
```

### 2. Environment Configuration
```bash
# Copy the environment template
cp .env.example .env

# Edit the .env file with your credentials
# See the "Environment Configuration" section below
```

### 3. Start with Docker
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## Environment Configuration

### Required Environment Variables

Edit your `.env` file with the following configurations:

#### GitHub OAuth Setup
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: AutoFlow AI
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:5000/auth/github/callback`
4. Copy the credentials to your `.env` file:

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

#### Email Configuration
For email notifications, configure SMTP settings:

**For Gmail:**
1. Enable 2-Factor Authentication on your Google Account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security > 2-Step Verification > App passwords
   - Generate a password for "AutoFlow AI"
3. Add to `.env`:

```bash
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

#### Session Security
Generate a secure session secret:
```bash
SESSION_SECRET=your-random-session-secret-here
```

### Complete .env File Example
```bash
# Session configuration
SESSION_SECRET=your-random-session-secret-here

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=AutoFlow AI <your-email@gmail.com>

# Docker compose email variables
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Database Configuration
DB_PATH=/app/data/database.db

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Optional: Backup schedule
BACKUP_SCHEDULE=0 2 * * *
```

## Manual Setup (Development)

If you prefer to run the services manually for development:

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Database Initialization
The database will be automatically created when the backend starts for the first time.

## Verification Steps

### 1. Health Check
Verify the backend is running:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "github_api": "available",
    "email_service": "configured"
  }
}
```

### 2. Frontend Access
1. Open http://localhost:3000
2. You should see the AutoFlow AI login page
3. Click "Login with GitHub" to test OAuth

### 3. GitHub Integration Test
1. Login with your GitHub account
2. Go to the Pipelines page
3. Click "Load Repositories" to test GitHub API access
4. Try importing a repository with GitHub Actions

### 4. Email Service Test
1. Go to the Alerts page
2. Click "Test Email" button
3. Check your email inbox for the test message

## Troubleshooting

### Common Issues

#### 1. Docker Container Fails to Start
**Problem**: Backend container exits with error
**Solution**: 
- Check Docker logs: `docker-compose logs backend`
- Verify environment variables are set correctly
- Ensure ports 3000 and 5000 are available

#### 2. GitHub OAuth Not Working
**Problem**: OAuth redirect fails or returns error
**Solution**:
- Verify GitHub OAuth app configuration
- Check callback URL matches exactly: `http://localhost:5000/auth/github/callback`
- Ensure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are correct

#### 3. Email Service Not Working
**Problem**: Test emails not being sent
**Solution**:
- Verify Gmail App Password is 16 characters (no spaces)
- Check SMTP credentials in .env file
- Ensure 2FA is enabled on your Google account
- Check backend logs for email service errors

#### 4. Database Connection Issues
**Problem**: Cannot connect to database
**Solution**:
- Check file permissions for database directory
- Verify DB_PATH environment variable
- Restart the backend service

#### 5. Frontend Build Errors
**Problem**: Frontend fails to compile
**Solution**:
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for conflicting packages
- Verify React scripts version compatibility

### Debug Mode

Enable debug logging for troubleshooting:

**Backend Debug:**
```bash
# In backend directory
DEBUG=autoflow:* npm run dev
```

**Frontend Debug:**
```bash
# In frontend directory
REACT_APP_DEBUG=true npm start
```

### Log Files

Check application logs for detailed error information:

**Docker Logs:**
```bash
# Backend logs
docker-compose logs backend

# Frontend logs
docker-compose logs frontend

# All services
docker-compose logs
```

**Manual Setup Logs:**
- Backend: Console output from `npm run dev`
- Frontend: Browser console for client-side errors

## Production Deployment

### Environment Considerations

For production deployment, update the following:

1. **Change default secrets:**
   ```bash
   SESSION_SECRET=generate-a-strong-random-secret
   ```

2. **Update CORS origin:**
   ```bash
   CORS_ORIGIN=https://your-production-domain.com
   ```

3. **Configure production database:**
   - Consider PostgreSQL for production workloads
   - Set up regular database backups

4. **SSL/TLS Configuration:**
   - Use HTTPS for all communications
   - Update GitHub OAuth callback URLs

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## Additional Configuration

### GitHub Webhook Setup (Optional)

For real-time pipeline updates:

1. Go to your GitHub repository settings
2. Navigate to Webhooks
3. Add webhook URL: `https://your-domain.com/api/webhooks/github`
4. Select events: "Workflow jobs", "Workflow runs"
5. Set content type to "application/json"

### Database Backup Setup

Set up automated backups:

```bash
# Add to crontab for daily backups
0 2 * * * docker exec autoflow-backend cp /app/data/database.db /app/data/backup-$(date +\%Y\%m\%d).db
```

### Monitoring Setup

Add monitoring and alerting:

1. **Application Monitoring**: Set up health check monitoring
2. **Log Aggregation**: Configure log collection and analysis
3. **Performance Monitoring**: Track response times and errors
4. **Uptime Monitoring**: Monitor service availability

## Support and Resources

### Documentation
- [API Documentation](./api-documentation.md)
- [Frontend Components](../frontend/README.md)
- [Backend Services](../backend/README.md)

### Getting Help
- Check the troubleshooting section above
- Review application logs for error details
- Create an issue in the GitHub repository
- Check the project's discussions for community help

### Development Resources
- [React.js Documentation](https://reactjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Material-UI Documentation](https://mui.com/)
- [Docker Documentation](https://docs.docker.com/)

---

Once you've completed this setup, your AutoFlow AI dashboard will be ready to monitor your CI/CD pipelines with real-time updates, GitHub integration, and email notifications!
