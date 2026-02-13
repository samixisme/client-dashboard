#!/bin/bash

#############################################
# Initial VPS Setup Script
# Run this ONCE on the VPS as the clientdash user
#############################################

set -e

echo "=== Client Dashboard - Initial VPS Setup ==="

# Configuration
DEPLOY_USER="clientdash"
DEPLOY_PATH="/var/www/client-samixism"
NODE_VERSION="18"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

echo_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running as correct user
if [ "$(whoami)" != "$DEPLOY_USER" ]; then
    echo_error "This script must be run as user: $DEPLOY_USER"
    exit 1
fi

echo "Step 1: Creating directory structure..."
mkdir -p $DEPLOY_PATH/{releases,shared,backups,logs,current}
echo_success "Directory structure created"

echo "Step 2: Installing Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo_success "Node.js installed: $(node --version)"
else
    echo_success "Node.js already installed: $(node --version)"
fi

echo "Step 3: Installing PM2 globally..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo_success "PM2 installed"
else
    echo_success "PM2 already installed: $(pm2 --version)"
fi

echo "Step 4: Setting up PM2 startup script..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER
echo_success "PM2 startup configured"

echo "Step 5: Installing pm2-serve for static frontend..."
pm2 install pm2-server-monit
npm install -g serve
echo_success "pm2-serve installed"

echo "Step 6: Creating shared environment file..."
cat > $DEPLOY_PATH/shared/.env << 'EOF'
# API Configuration
PORT=3001
NODE_ENV=production

# Optional: API Security
# API_KEY=your-secret-api-key-here
# ALLOWED_ORIGINS=https://client.samixism.com

# Rate Limiting
RATE_LIMIT_MAX=100

# Gemini AI (if used)
# GEMINI_API_KEY=your-gemini-api-key

# Firebase Admin SDK
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_CLIENT_EMAIL=your-client-email
# FIREBASE_PRIVATE_KEY=your-private-key

# Monitoring
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health
EOF

echo_warning "Environment file created at: $DEPLOY_PATH/shared/.env"
echo_warning "Please edit this file and add your actual credentials"

echo "Step 7: Creating ecosystem config template..."
cat > $DEPLOY_PATH/shared/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'client-dashboard-api',
      script: './api/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      error_file: '/var/www/client-samixism/logs/api-error.log',
      out_file: '/var/www/client-samixism/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 3000,
      wait_ready: true,
      cron_restart: '0 3 * * *',
    },
    {
      name: 'client-dashboard-frontend',
      script: 'serve',
      env: {
        PM2_SERVE_PATH: './dist',
        PM2_SERVE_PORT: 3000,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html',
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      autorestart: true,
      error_file: '/var/www/client-samixism/logs/frontend-error.log',
      out_file: '/var/www/client-samixism/logs/frontend-out.log',
    },
  ],
};
EOF
echo_success "Ecosystem config template created"

echo "Step 8: Setting up log rotation..."
sudo tee /etc/logrotate.d/client-dashboard > /dev/null << EOF
$DEPLOY_PATH/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $DEPLOY_USER $DEPLOY_USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
echo_success "Log rotation configured"

echo "Step 9: Creating deployment scripts..."
chmod +x $DEPLOY_PATH/shared/*.sh 2>/dev/null || true
echo_success "Deployment scripts ready"

echo "Step 10: Installing Nginx (if not already installed)..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y nginx
    echo_success "Nginx installed"
else
    echo_success "Nginx already installed"
fi

echo "Step 11: Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/client-dashboard > /dev/null << 'EOF'
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=client_dashboard_limit:10m rate=10r/s;

# Upstream backends
upstream client_dashboard_frontend {
    least_conn;
    server localhost:3000 max_fails=3 fail_timeout=30s;
}

upstream client_dashboard_api {
    least_conn;
    server localhost:3001 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    listen [::]:80;
    server_name client.samixism.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name client.samixism.com;

    # SSL certificates (will be configured by Certbot)
    # ssl_certificate /etc/letsencrypt/live/client.samixism.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/client.samixism.com/privkey.pem;
    # include /etc/letsencrypt/options-ssl-nginx.conf;
    # ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/client-dashboard-access.log;
    error_log /var/log/nginx/client-dashboard-error.log;

    # Root directory
    root /var/www/client-samixism/current/dist;
    index index.html;

    # Client max body size
    client_max_body_size 50M;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # API proxy
    location /api/ {
        limit_req zone=client_dashboard_limit burst=20 nodelay;

        proxy_pass http://client_dashboard_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://client_dashboard_api/health;
        access_log off;
    }

    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Feedback widget
    location /feedback.js {
        add_header Cache-Control "public, max-age=3600";
        try_files $uri =404;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/client-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
echo_success "Nginx configuration created"

echo "Step 12: Installing Certbot for SSL..."
if ! command -v certbot &> /dev/null; then
    sudo apt-get install -y certbot python3-certbot-nginx
    echo_success "Certbot installed"
else
    echo_success "Certbot already installed"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo_success "Initial setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit environment file: nano $DEPLOY_PATH/shared/.env"
echo "2. Add GitHub SSH key to this server:"
echo "   ssh-keygen -t ed25519 -C 'github-deploy'"
echo "   cat ~/.ssh/id_ed25519.pub  # Add to GitHub Deploy Keys"
echo "3. Set up SSL certificate:"
echo "   sudo certbot --nginx -d client.samixism.com"
echo "4. Add GitHub Secrets to your repository:"
echo "   - VPS_SSH_KEY: Private SSH key for deployment"
echo "5. Push to main branch to trigger first deployment"
echo ""
echo "Useful commands:"
echo "  pm2 status                 # Check PM2 processes"
echo "  pm2 logs                   # View application logs"
echo "  pm2 monit                  # Real-time monitoring"
echo "  sudo nginx -t              # Test Nginx config"
echo "  sudo systemctl reload nginx # Reload Nginx"
echo ""
