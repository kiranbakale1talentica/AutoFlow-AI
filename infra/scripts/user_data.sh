#!/bin/bash
# User Data Script for AutoFlow-AI Application Setup
# This script runs on EC2 instance startup to configure the application environment

set -e  # Exit on any error
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting AutoFlow-AI application setup..."

# Variables from Terraform
PROJECT_NAME="${project_name}"
ENVIRONMENT="${environment}"
DATABASE_URL="${database_url}"
SESSION_SECRET="${session_secret}"
REACT_APP_API_URL="${react_app_api_url}"
GITHUB_REPO_URL="${github_repo_url}"

# System update and package installation
echo "Updating system packages..."
yum update -y

echo "Installing required packages..."
yum install -y git curl wget unzip

# Install Node.js 18.x
echo "Installing Node.js 18.x..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Verify Node.js and npm installation
node --version
npm --version

# Install PM2 for process management
echo "Installing PM2..."
npm install -g pm2

# Install Docker (for future containerization if needed)
echo "Installing Docker..."
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Create application directory
APP_DIR="/opt/autoflow-ai"
echo "Creating application directory: $APP_DIR"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone the repository
echo "Cloning repository: $GITHUB_REPO_URL"
git clone $GITHUB_REPO_URL .

# Set proper ownership
chown -R ec2-user:ec2-user $APP_DIR

# Backend setup
echo "Setting up backend..."
cd $APP_DIR/backend

# Create .env file for backend
cat > .env << EOF
NODE_ENV=$ENVIRONMENT
PORT=5000
DATABASE_URL=$DATABASE_URL
SESSION_SECRET=$SESSION_SECRET
CORS_ORIGIN=$REACT_APP_API_URL
EOF

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

# Frontend setup
echo "Setting up frontend..."
cd $APP_DIR/frontend

# Create .env file for frontend
cat > .env << EOF
REACT_APP_API_URL=$REACT_APP_API_URL
REACT_APP_ENVIRONMENT=$ENVIRONMENT
EOF

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Build frontend for production
echo "Building frontend for production..."
npm run build

# Setup PM2 ecosystem file
echo "Setting up PM2 ecosystem..."
cd $APP_DIR
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'autoflow-backend',
      script: './backend/server.js',
      cwd: '/opt/autoflow-ai',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/var/log/autoflow-backend-error.log',
      out_file: '/var/log/autoflow-backend-out.log',
      log_file: '/var/log/autoflow-backend.log',
      time: true
    },
    {
      name: 'autoflow-frontend',
      script: 'npx',
      args: 'serve -s build -l 3000',
      cwd: '/opt/autoflow-ai/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/autoflow-frontend-error.log',
      out_file: '/var/log/autoflow-frontend-out.log',
      log_file: '/var/log/autoflow-frontend.log',
      time: true
    }
  ]
};
EOF

# Install serve globally for frontend serving
echo "Installing serve for frontend..."
npm install -g serve

# Set proper ownership for PM2 files
chown -R ec2-user:ec2-user $APP_DIR

# Setup systemd service for PM2
echo "Setting up PM2 systemd service..."
sudo -u ec2-user bash << 'USEREOF'
cd /opt/autoflow-ai
export HOME=/home/ec2-user
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user
USEREOF

# Get the startup command from PM2 and execute it
PM2_STARTUP_CMD=$(sudo -u ec2-user pm2 startup systemd -u ec2-user --hp /home/ec2-user | grep "sudo env" | head -1)
if [ ! -z "$PM2_STARTUP_CMD" ]; then
    echo "Executing PM2 startup command: $PM2_STARTUP_CMD"
    eval $PM2_STARTUP_CMD
fi

# Setup log rotation
echo "Setting up log rotation..."
cat > /etc/logrotate.d/autoflow-ai << 'EOF'
/var/log/autoflow-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ec2-user ec2-user
    postrotate
        sudo -u ec2-user pm2 reloadLogs
    endscript
}
EOF

# Create health check script
echo "Creating health check script..."
cat > /opt/autoflow-ai/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for AutoFlow-AI

BACKEND_URL="http://localhost:5000/api/health"
FRONTEND_URL="http://localhost:3000"

# Check backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%%{http_code}" $BACKEND_URL || echo "000")
# Check frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%%{http_code}" $FRONTEND_URL || echo "000")

if [ "$BACKEND_STATUS" = "200" ] && [ "$FRONTEND_STATUS" = "200" ]; then
    echo "OK: Both services are healthy"
    exit 0
else
    echo "ERROR: Backend: $BACKEND_STATUS, Frontend: $FRONTEND_STATUS"
    exit 1
fi
EOF

chmod +x /opt/autoflow-ai/health-check.sh

# Setup health check cron job
echo "Setting up health check cron job..."
echo "*/5 * * * * /opt/autoflow-ai/health-check.sh >> /var/log/health-check.log 2>&1" | crontab -u ec2-user -

# Configure CloudWatch agent (optional - for monitoring)
echo "Setting up basic monitoring..."
yum install -y amazon-cloudwatch-agent

# Create basic CloudWatch config
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/autoflow-*.log",
                        "log_group_name": "/aws/ec2/autoflow-ai",
                        "log_stream_name": "{instance_id}/application"
                    },
                    {
                        "file_path": "/var/log/user-data.log",
                        "log_group_name": "/aws/ec2/autoflow-ai",
                        "log_stream_name": "{instance_id}/user-data"
                    }
                ]
            }
        }
    },
    "metrics": {
        "namespace": "AutoFlow-AI",
        "metrics_collected": {
            "cpu": {
                "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": ["used_percent"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "mem": {
                "measurement": ["mem_used_percent"],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
    -s

# Final status check
echo "Checking application status..."
sleep 30  # Wait for services to start

# Check if PM2 processes are running
sudo -u ec2-user pm2 status

echo "AutoFlow-AI application setup completed successfully!"
echo "Backend running on port 5000"
echo "Frontend running on port 3000"
echo "Health check available at /opt/autoflow-ai/health-check.sh"

echo "Setup script finished at $(date)"
