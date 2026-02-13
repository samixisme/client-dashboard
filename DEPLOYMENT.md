# Deployment Guide - client.samixism.com

Complete deployment guide for the Client Dashboard application to production VPS.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Drive API Setup](#google-drive-api-setup)
3. [VPS Initial Setup](#vps-initial-setup)
4. [GitHub Secrets Configuration](#github-secrets-configuration)
5. [Nginx Configuration](#nginx-configuration)
6. [First Deployment](#first-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Rollback Procedures](#rollback-procedures)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Prerequisites

- **VPS:** 49.13.129.43 (4 vCPU, 8GB RAM, 80GB disk)
- **Domain:** client.samixism.com (configured on Cloudflare)
- **Cloudflare SSL Mode:** Full (Strict)
- **Google One:** 2TB storage plan
- **GitHub Repository:** Access with deployment SSH keys

---

## ☁️ Google Drive API Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "ClientDashboard-Storage"
3. Enable Google Drive API:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### Step 2: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Name: `client-dashboard-storage`
4. Role: **None** (we'll use folder-level permissions)
5. Click "Done"

### Step 3: Generate Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose **JSON** format
5. Download the file (you'll need this later)

**Service account email will look like:**
```
client-dashboard-storage@your-project-id.iam.gserviceaccount.com
```

### Step 4: Create Google Drive Folder

1. Open [Google Drive](https://drive.google.com/)
2. Create folder: "ClientDashboard-Storage"
3. Right-click folder → "Share"
4. Add service account email with **Editor** permissions
5. Copy folder ID from URL:
   ```
   https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j
                                           ^^^^^^^^^^^^^^^^^^^^
                                           This is your folder ID
   ```

---

## 🖥️ VPS Initial Setup

### Option A: Automated Setup (Recommended)

Since you already have a running VPS with existing sites, **SKIP** running the full `scripts/initial-setup.sh` and follow the manual steps below.

### Option B: Manual Setup

```bash
# 1. SSH into your VPS as root or with sudo
ssh root@49.13.129.43

# 2. Create dedicated user
sudo useradd -m -s /bin/bash clientdash

# 3. Create application directories
sudo -u clientdash mkdir -p /home/clientdash/client-dashboard/{releases,logs,.cache}

# 4. Install PM2 (if not already installed)
npm install -g pm2

# 5. Generate SSH key for GitHub (if needed)
sudo -u clientdash ssh-keygen -t rsa -b 4096 -C "deploy@client.samixism.com" -N "" -f /home/clientdash/.ssh/id_rsa

# 6. Add public key to GitHub
sudo cat /home/clientdash/.ssh/id_rsa.pub
# Copy this and add to GitHub: Settings → Deploy keys → Add deploy key

# 7. Clone repository
sudo -u clientdash git clone git@github.com:yourusername/client-dashboard.git /home/clientdash/client-dashboard/releases/initial

# 8. Create symlink
sudo -u clientdash ln -s /home/clientdash/client-dashboard/releases/initial /home/clientdash/client-dashboard/current

# 9. Install dependencies
cd /home/clientdash/client-dashboard/current
sudo -u clientdash npm ci --production

# 10. Build application
sudo -u clientdash npm run build
```

### Step 2: Create Production Environment File

```bash
sudo -u clientdash nano /home/clientdash/client-dashboard/current/.env
```

**Paste this content:**
```bash
NODE_ENV=production
PORT=3001
VITE_PORT=3000
API_KEY=<generate-with-openssl-rand-base64-32>
ALLOWED_ORIGINS=https://client.samixism.com
RATE_LIMIT_MAX=50
GOOGLE_SERVICE_ACCOUNT_JSON='<paste-service-account-json-here>'
GOOGLE_DRIVE_ROOT_FOLDER_ID=<your-folder-id>
GEMINI_API_KEY=<your-gemini-key-if-using-ai>
```

**Generate API key:**
```bash
openssl rand -base64 32
```

### Step 3: Deploy Firestore Security Rules

```bash
# Copy production rules
cp firestore.rules.production firestore.rules

# Deploy to Firebase
firebase deploy --only firestore:rules
```

---

## 🔐 GitHub Secrets Configuration

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `VPS_SSH_KEY` | Private SSH key for deployment | Content of `/home/clientdash/.ssh/id_rsa` on VPS |
| `API_KEY` | API authentication key | Generated with `openssl rand -base64 32` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account credentials | Content of downloaded JSON file (entire object) |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Drive folder ID | From Drive folder URL |
| `GEMINI_API_KEY` | Optional: AI features | From Google AI Studio |

**To get VPS_SSH_KEY:**
```bash
# SSH into your VPS
ssh your-user@YOUR_VPS_IP

# Display the private key
sudo cat /home/YOUR_USER/.ssh/id_rsa
```

Copy entire private key output (including header and footer)

**⚠️ Security:** Never commit this key to git - use GitHub Secrets only!

---

## 🌐 Nginx Configuration

Since you already have an Nginx configuration, **add this server block** to your existing config:

**File:** `/etc/nginx/sites-available/client-samixism` (or add to your existing config)

```nginx
# Rate limiting zones (add at the top of nginx.conf, OUTSIDE server blocks)
limit_req_zone $binary_remote_addr zone=client_api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=client_static_limit:10m rate=50r/s;

# Upstream for API (PM2 cluster)
upstream client_api_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
}

# Upstream for frontend
upstream client_frontend_backend {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name client.samixism.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name client.samixism.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/client.samixism.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/client.samixism.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cloudflare real IP (if using Cloudflare)
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    real_ip_header CF-Connecting-IP;

    client_max_body_size 100M;

    # API endpoints
    location /api/ {
        limit_req zone=client_api_limit burst=20 nodelay;
        proxy_pass http://client_api_backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Frontend application
    location / {
        limit_req zone=client_static_limit burst=100 nodelay;
        proxy_pass http://client_frontend_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets with cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://client_frontend_backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check (no rate limiting)
    location /health {
        proxy_pass http://client_api_backend/health;
        access_log off;
    }
}
```

**Apply Nginx configuration:**

```bash
# Test configuration
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx
```

**Setup SSL certificate (if not already done):**

```bash
sudo certbot --nginx -d client.samixism.com
```

---

## 🚀 First Deployment

### Manual First Deployment

```bash
# 1. Start PM2 processes
cd /home/clientdash/client-dashboard/current
sudo -u clientdash pm2 start ecosystem.config.js

# 2. Save PM2 configuration
sudo -u clientdash pm2 save

# 3. Setup PM2 startup script
sudo -u clientdash pm2 startup systemd -u clientdash --hp /home/clientdash

# 4. Enable PM2 on boot (run the command from previous step output)

# 5. Check status
sudo -u clientdash pm2 status

# 6. Check logs
sudo -u clientdash pm2 logs
```

### Automated CI/CD Deployment

Once GitHub Actions is configured, every push to `main` branch will:

1. ✅ Run tests
2. ✅ Build application
3. ✅ Deploy to VPS
4. ✅ Create backup
5. ✅ Reload PM2
6. ✅ Health check
7. ✅ Auto-rollback on failure

**Trigger manual deployment:**
```
GitHub → Actions → Deploy to Production → Run workflow
```

---

## 📊 Monitoring & Maintenance

### Check Application Status

```bash
# PM2 status
sudo -u clientdash pm2 status

# View logs
sudo -u clientdash pm2 logs client-samixism-api
sudo -u clientdash pm2 logs client-samixism-frontend

# Nginx status
sudo systemctl status nginx

# Disk usage
df -h

# Check cache size
du -sh /home/clientdash/client-dashboard/.cache
```

### Google Drive Quota Monitoring

```bash
# Check current deployment logs for quota warnings
sudo -u clientdash pm2 logs --lines 100 | grep -i quota
```

**Daily limits:**
- Upload: 750GB/day
- API requests: 1000/minute

### Log Rotation

Logs are automatically rotated (configured in PM2):
- Keep 30 days of logs
- Compress old logs
- Managed by PM2

---

## 🔄 Rollback Procedures

### Automatic Rollback

GitHub Actions automatically rolls back if health checks fail.

### Manual Rollback

```bash
# SSH to VPS
ssh clientdash@49.13.129.43

# Run rollback script
cd /home/clientdash/client-dashboard
bash scripts/rollback.sh

# Choose option:
# 1) Rollback to latest backup
# 2) Rollback to specific backup
# 3) Rollback to specific release by commit SHA
```

### Emergency Rollback

```bash
# Quick rollback to previous deployment
cd /home/clientdash/client-dashboard
LATEST_BACKUP=$(ls -dt backup_* | head -1)
ln -sfn $LATEST_BACKUP current
pm2 reload ecosystem.config.js
```

---

## 🔧 Troubleshooting

### Issue: Application won't start

**Check:**
```bash
# PM2 logs
sudo -u clientdash pm2 logs --err --lines 50

# Environment variables
cat /home/clientdash/client-dashboard/current/.env

# Port conflicts
sudo netstat -tulpn | grep -E ':(3000|3001)'
```

### Issue: "API_KEY required" errors

**Fix:**
```bash
# Make sure .env exists and has API_KEY
cat /home/clientdash/client-dashboard/current/.env | grep API_KEY

# Reload PM2 to pick up new env vars
sudo -u clientdash pm2 reload ecosystem.config.js --update-env
```

### Issue: CORS errors

**Check:**
```bash
# Verify ALLOWED_ORIGINS is set correctly
cat /home/clientdash/client-dashboard/current/.env | grep ALLOWED_ORIGINS

# Should be: ALLOWED_ORIGINS=https://client.samixism.com
```

### Issue: Google Drive quota exceeded

**Check quota:**
```bash
# View recent quota warnings
sudo -u clientdash pm2 logs | grep -i "quota\|daily"

# Clear cache to reduce API calls
rm -rf /home/clientdash/client-dashboard/.cache/*
sudo -u clientdash pm2 restart client-samixism-api
```

**Daily limit resets at midnight UTC.**

### Issue: SSL certificate errors

**Renew certificate:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Issue: 502 Bad Gateway

**Possible causes:**
1. PM2 processes not running
2. Port conflicts
3. Application crashed

**Debug:**
```bash
# Check if ports are listening
curl http://localhost:3001/health
curl http://localhost:3000

# Restart PM2
sudo -u clientdash pm2 restart all

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📞 Support Checklist

Before asking for help, collect this info:

```bash
# System info
uname -a
df -h
free -h

# PM2 status
sudo -u clientdash pm2 status
sudo -u clientdash pm2 logs --lines 50 --err

# Nginx status
sudo nginx -t
sudo systemctl status nginx

# Recent deployments
ls -lh /home/clientdash/client-dashboard/releases/

# Environment check (SAFE - no secrets shown)
ls -la /home/clientdash/client-dashboard/current/.env
```

---

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] Google Cloud Project created
- [ ] Google Drive API enabled
- [ ] Service account created with JSON key
- [ ] Drive folder shared with service account
- [ ] GitHub secrets configured
- [ ] VPS user `clientdash` created
- [ ] SSH keys added to GitHub
- [ ] Nginx configuration added
- [ ] SSL certificate installed
- [ ] Firestore security rules deployed

### Post-Deployment

- [ ] Application accessible at https://client.samixism.com
- [ ] Health check returns 200: https://client.samixism.com/health
- [ ] Login works (Firebase Auth)
- [ ] File uploads work (Google Drive API)
- [ ] PM2 processes running (2 API + 1 frontend)
- [ ] Logs clean (no errors)
- [ ] SSL A+ rating (test at ssllabs.com)
- [ ] Cloudflare caching working

---

## 🎯 Quick Reference Commands

```bash
# Restart application
sudo -u clientdash pm2 restart all

# View logs
sudo -u clientdash pm2 logs

# Check health
curl http://localhost:3001/health

# Reload PM2 config
sudo -u clientdash pm2 reload ecosystem.config.js --update-env

# Nginx reload
sudo systemctl reload nginx

# Check disk space
df -h

# Check quota warnings
sudo -u clientdash pm2 logs | grep -i quota
```

---

**🎉 Your deployment is now complete! Visit https://client.samixism.com to see your app live.**
