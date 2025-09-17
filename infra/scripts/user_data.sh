#!/bin/bash

# AutoFlow AI - EC2 User Data Script
# This script sets up the AutoFlow AI application on EC2 instances

set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install required packages
apt-get install -y \
    curl \
    wget \
    git \
    nginx \
    build-essential \
    software-properties-common

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Create application user
useradd -m -s /bin/bash autoflow
usermod -aG sudo autoflow

# Create application directory
mkdir -p /opt/autoflow-ai
chown autoflow:autoflow /opt/autoflow-ai

# Clone the application (in production, use a release artifact)
cd /opt/autoflow-ai
git clone https://github.com/your-org/AutoFlow-AI.git .
chown -R autoflow:autoflow /opt/autoflow-ai

# Switch to application user for setup
sudo -u autoflow bash << 'EOF'
cd /opt/autoflow-ai

# Install backend dependencies
cd backend
npm install --production

# Create environment file
cat > .env << ENV_EOF
NODE_ENV=production
PORT=3001

# Database configuration
DB_HOST=${db_endpoint}
DB_NAME=${db_name}
DB_USER=${db_username}
DB_PASSWORD=${db_password}

# Session secret (should be randomly generated in production)
SESSION_SECRET=$(openssl rand -base64 32)

# GitHub OAuth (configure these in your GitHub app)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://your-domain.com/auth/github/callback

# Email configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ENV_EOF

cd ..

# Install frontend dependencies and build
cd frontend
npm install
npm run build

cd ..
EOF

# Configure nginx
cat > /etc/nginx/sites-available/autoflow-ai << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    # Serve static files
    location / {
        root /opt/autoflow-ai/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy auth requests to backend
    location /auth/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF

# Enable the site
ln -sf /etc/nginx/sites-available/autoflow-ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Start and enable nginx
systemctl start nginx
systemctl enable nginx

# Start the application with PM2
sudo -u autoflow bash << 'EOF'
cd /opt/autoflow-ai/backend
pm2 start server.js --name "autoflow-ai"
pm2 save
pm2 startup
EOF

# Configure PM2 startup script for root
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u autoflow --hp /home/autoflow

# Enable and start the PM2 service
systemctl enable pm2-autoflow
systemctl start pm2-autoflow

# Create log rotation for application logs
cat > /etc/logrotate.d/autoflow-ai << 'LOG_EOF'
/opt/autoflow-ai/backend/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 0644 autoflow autoflow
    postrotate
        sudo -u autoflow pm2 reloadLogs
    endscript
}
LOG_EOF

# Setup basic monitoring
cat > /opt/autoflow-ai/health-check.sh << 'HEALTH_EOF'
#!/bin/bash
# Simple health check script

# Check if nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "ERROR: nginx is not running"
    exit 1
fi

# Check if the application is responding
if ! curl -f -s http://localhost:80 > /dev/null; then
    echo "ERROR: Application is not responding"
    exit 1
fi

echo "OK: All services are running"
exit 0
HEALTH_EOF

chmod +x /opt/autoflow-ai/health-check.sh

# Add health check to cron (every 5 minutes)
echo "*/5 * * * * root /opt/autoflow-ai/health-check.sh >> /var/log/autoflow-health.log 2>&1" >> /etc/crontab

# Signal that the instance is ready
/opt/aws/bin/cfn-signal -e $? --stack ${AWS::StackName} --resource AutoScalingGroup --region ${AWS::Region}

echo "AutoFlow AI setup completed successfully!"
