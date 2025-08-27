# AutoFlow AI - Docker Deployment Guide

## 🚀 Quick Start with Docker

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available

### 1. Environment Setup

Copy the environment template and configure:
```bash
cp .env.template .env
```

Edit `.env` file with your configurations:
- Set a strong `SESSION_SECRET`
- Configure email settings for OTP authentication
- Add GitHub credentials for repository integration (optional)
- Add GitHub credentials for CI/CD integration (optional)

### 2. Build and Run

#### Development Mode
```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f
```

#### Production Mode
```bash
# Build and start with production profile
docker-compose --profile production up -d --build

# This includes nginx reverse proxy and backup service
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

#### Default Admin Account
- **Email**: admin@autoflow.ai
- **Login**: Use email OTP authentication

## 🔧 Service Architecture

### Backend Service (`autoflow-backend`)
- **Image**: Built from `backend/Dockerfile` (multi-stage with distroless)
- **Port**: 5000
- **Features**: 
  - Node.js Express API
  - WebSocket support for real-time updates
  - Email OTP authentication
  - GitHub integration
  - SQLite database with volume persistence

### Frontend Service (`autoflow-frontend`)
- **Image**: Built from `frontend/Dockerfile` (multi-stage with distroless)
- **Port**: 3000
- **Features**:
  - React SPA with Material-UI
  - Production-optimized build
  - Static file serving

### Optional Services (Production Profile)

#### Nginx Reverse Proxy (`autoflow-nginx`)
- **Purpose**: Load balancing, SSL termination, static file serving
- **Ports**: 80, 443
- **Config**: `nginx/nginx.conf`

#### Backup Service (`autoflow-backup`)
- **Purpose**: Automated database backups
- **Schedule**: Configurable via `BACKUP_SCHEDULE`
- **Retention**: 7 days (configurable)

## 📁 Volume Management

### Persistent Volumes
- `autoflow-database`: SQLite database file
- `autoflow-backend-data`: File uploads and user data
- `autoflow-backend-logs`: Application logs
- `autoflow-backup-data`: Database backups

### Backup and Restore
```bash
# Manual backup
docker-compose exec backend cp /app/database.db /app/uploads/backup_$(date +%Y%m%d).db

# List volumes
docker volume ls | grep autoflow

# Backup volume data
docker run --rm -v autoflow-database:/data -v $(pwd):/backup alpine tar czf /backup/database-backup.tar.gz -C /data .

# Restore volume data
docker run --rm -v autoflow-database:/data -v $(pwd):/backup alpine tar xzf /backup/database-backup.tar.gz -C /data
```

## 🔒 Security Features

### Container Security
- **Distroless base images**: Minimal attack surface
- **Non-root user**: Containers run as non-privileged user
- **Read-only filesystem**: Prevents runtime modifications
- **Capability dropping**: Removes unnecessary Linux capabilities
- **Security options**: `no-new-privileges` enabled

### Application Security
- **Helmet.js**: Security headers middleware
- **CORS protection**: Configured origins
- **Session security**: Secure session management
- **Input validation**: Request validation and sanitization

## 🐛 Troubleshooting

### Common Issues

#### Container Health Checks Failing
```bash
# Check container status
docker-compose ps

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Check health status
docker inspect autoflow-backend | grep -A 10 "Health"
```

#### Database Connection Issues
```bash
# Verify database volume
docker volume inspect autoflow-database

# Check database permissions
docker-compose exec backend ls -la /app/
```

#### Frontend Not Loading
```bash
# Check build output
docker-compose logs frontend

# Verify frontend service
curl http://localhost:3000
```

### Performance Optimization

#### Resource Limits
Add to `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

#### Log Management
```bash
# Configure log rotation
docker-compose.yml:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

## 📊 Monitoring

### Health Checks
```bash
# All services status
docker-compose ps

# Backend health
curl http://localhost:5000/api/health

# Frontend health
curl http://localhost:3000
```

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail 100 frontend
```

### Resource Usage
```bash
# Container stats
docker stats autoflow-backend autoflow-frontend

# Volume usage
docker system df -v
```

## 🔄 Updates and Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Clean old images
docker image prune -f
```

### Database Migration
```bash
# Backup before migration
docker-compose exec backend node -e "require('./models/database.js').backup()"

# Apply migrations
docker-compose exec backend node migrations/migrate.js
```

### Cleanup
```bash
# Remove stopped containers
docker-compose down

# Remove all (including volumes - BE CAREFUL)
docker-compose down -v

# Clean unused resources
docker system prune -f
```

## 🌐 Production Deployment

### Environment Variables for Production
```bash
# Required
SESSION_SECRET=your-complex-random-secret-key
EMAIL_USER=your-production-email
EMAIL_PASS=your-email-app-password

# Optional but recommended
GITHUB_CLIENT_ID=your-github-app-id
GITHUB_CLIENT_SECRET=your-github-app-secret
```

### SSL Certificate Setup
1. Place certificates in `nginx/ssl/`
2. Update `nginx/nginx.conf` with certificate paths
3. Run with production profile: `docker-compose --profile production up -d`

### External Database (Optional)
For production, consider using external database:
```yaml
# Add to docker-compose.yml
environment:
  - DATABASE_URL=postgresql://user:pass@external-db:5432/autoflow
```

---

## 📞 Support

- **Documentation**: Check README.md files in respective directories
- **Issues**: Report on GitHub repository
- **Logs**: Use `docker-compose logs` for debugging
- **Health**: Monitor `/api/health` endpoint

Enjoy monitoring your CI/CD pipelines with AutoFlow AI! 🚀
