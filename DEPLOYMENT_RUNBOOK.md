# 📘 Client Dashboard - Production Deployment Runbook

**Version**: 1.0.0
**Last Updated**: 2026-02-13
**Maintainer**: DevOps Team
**Status**: Production Ready ✅

---

## 🎯 Quick Reference

| Resource | Location | Purpose |
|----------|----------|---------|
| **Production Sites** | client.samixism.com, mauboussin.ma | Live applications |
| **VPS Server** | 49.13.129.43 (CentOS + cPanel/Engintron) | Hosting infrastructure |
| **Node.js Version** | v20.20.0 LTS | Runtime environment |
| **PM2 Services** | clientdash user | Process management |
| **Nginx Configs** | `/etc/nginx/conf.d/` | Reverse proxy configs |

---

## 📊 System Architecture

```
Internet
    ↓
┌─────────────────────────────────────────┐
│  Nginx (Ports 80/443)                   │
│  - Reverse Proxy                        │
│  - SSL Termination                      │
│  - Rate Limiting                        │
└─────────────────────────────────────────┘
    ↓                           ↓
┌──────────────────┐   ┌──────────────────┐
│  Frontend        │   │  API Backend     │
│  Port 3000       │   │  Port 3001       │
│  (Vite/React)    │   │  (Express)       │
└──────────────────┘   └──────────────────┘
    ↓                           ↓
┌─────────────────────────────────────────┐
│  Firebase Services                       │
│  - Firestore (Database)                 │
│  - Authentication                        │
│  - Storage                               │
└─────────────────────────────────────────┘
```

---

## 🚀 Deployment Procedures

### **Initial Setup (One-Time)**

This was completed in Session 1-5. For reference only.

#### **1. Server Prerequisites**
```bash
# Node.js v20 LTS
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# PM2 (global)
npm install -g pm2

# Application dependencies
cd /home/clientdash/client-dashboard
npm install
```

#### **2. Nginx Configuration**
```bash
# Configs managed by Engintron
# Primary files:
/etc/nginx/conf.d/default.conf        # HTTP (port 80)
/etc/nginx/conf.d/default_https.conf  # HTTPS (port 443)

# Domain-specific blocks in default_https.conf:
# - client.samixism.com (lines ~109-130)
# - mauboussin.ma (lines ~51-70)
```

#### **3. PM2 Service Setup**
```bash
cd /home/clientdash/client-dashboard
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u clientdash --hp /home/clientdash
```

---

## 🔄 Regular Operations

### **Restart Services**

#### **Restart PM2 Services**
```bash
# As root or clientdash user
sudo -u clientdash pm2 restart all

# Verify status
sudo -u clientdash pm2 list
sudo -u clientdash pm2 logs --lines 50
```

#### **Reload Nginx**
```bash
# Test configuration first
nginx -t

# Reload if test passes
systemctl reload nginx

# Full restart if needed
systemctl restart nginx
```

### **Check Service Status**

```bash
# Quick health check
/root/system-health-monitor.sh

# PM2 status
sudo -u clientdash pm2 list
sudo -u clientdash pm2 monit

# Nginx status
systemctl status nginx
nginx -t

# Check SSL certificates
/root/ssl-certificate-monitor.sh

# Check config protection
/root/nginx-config-protection.sh check
```

### **View Logs**

```bash
# PM2 logs
sudo -u clientdash pm2 logs
sudo -u clientdash pm2 logs client-dashboard-api
sudo -u clientdash pm2 logs client-dashboard-frontend

# Application logs
tail -f /home/clientdash/client-dashboard/logs/api-error.log
tail -f /home/clientdash/client-dashboard/logs/api-out.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Monitoring logs
tail -f /var/log/system-health-monitor.log
tail -f /var/log/ssl-certificate-monitor.log
tail -f /var/log/pm2-healthcheck.log
tail -f /var/log/nginx-config-protection.log
```

---

## 🆘 Troubleshooting Guide

### **Problem: Site Not Accessible**

**Symptoms**: ERR_CONNECTION_REFUSED or timeout

**Diagnosis**:
```bash
# 1. Check Nginx
systemctl status nginx
nginx -t

# 2. Check PM2 services
sudo -u clientdash pm2 list

# 3. Check ports
netstat -tulpn | grep -E ':(80|443|3000|3001)'

# 4. Test site responses
curl -I https://client.samixism.com
curl -I https://mauboussin.ma
```

**Solutions**:
```bash
# If Nginx is down
systemctl start nginx

# If PM2 services are down
cd /home/clientdash/client-dashboard
sudo -u clientdash pm2 restart all

# If ports not listening (dual-stack issue)
/root/nginx-config-protection.sh check
/root/nginx-config-protection.sh fix  # if issues found
```

---

### **Problem: SSL Certificate Error**

**Symptoms**: "Your connection is not private" or certificate mismatch

**Diagnosis**:
```bash
# Check certificate details
/root/ssl-certificate-monitor.sh

# Verify server block listen directives
grep -A5 "server_name client.samixism.com" /etc/nginx/conf.d/default_https.conf
grep -A5 "server_name mauboussin.ma" /etc/nginx/conf.d/default_https.conf
```

**Solutions**:
```bash
# If listen directives are missing
/root/nginx-config-protection.sh check
/root/nginx-config-protection.sh fix

# Verify fix
nginx -t
systemctl reload nginx

# Test SSL
echo | openssl s_client -servername client.samixism.com -connect client.samixism.com:443 | grep -E 'subject=|issuer='
```

---

### **Problem: API Service Crashes**

**Symptoms**: PM2 shows restarts, API returns 502

**Diagnosis**:
```bash
# Check PM2 logs
sudo -u clientdash pm2 logs client-dashboard-api --lines 100

# Check Node.js version
node --version  # Should be v20.20.0+

# Check for common errors
grep -i "error\|crash\|exception" /home/clientdash/client-dashboard/logs/api-error.log | tail -50
```

**Solutions**:
```bash
# If Node.js is old version
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs
cd /home/clientdash/client-dashboard
sudo -u clientdash pm2 restart all

# If dependency issue
cd /home/clientdash/client-dashboard
npm install
sudo -u clientdash pm2 restart all

# Nuclear option - full reinstall
cd /home/clientdash/client-dashboard
rm -rf node_modules package-lock.json
npm install
sudo -u clientdash pm2 restart all
```

---

### **Problem: Nginx Config Reverted**

**Symptoms**: Sites show wrong content or SSL errors after Engintron update

**Diagnosis**:
```bash
# Check for ipv6only=off (BAD)
grep "ipv6only=off" /etc/nginx/conf.d/default.conf
grep "ipv6only=off" /etc/nginx/conf.d/default_https.conf

# Check for missing listen directives
/root/nginx-config-protection.sh check
```

**Solutions**:
```bash
# Automatic fix
/root/nginx-config-protection.sh fix

# OR restore from backup
/root/nginx-config-protection.sh restore

# Verify and reload
nginx -t && systemctl reload nginx
```

---

## 🛡️ Security & Protection

### **Automated Protection Systems**

#### **1. PM2 Health Check** (Every 5 minutes)
- **Script**: `/home/clientdash/client-dashboard/pm2-healthcheck.sh`
- **Cron**: `*/5 * * * *`
- **Function**: Auto-restarts PM2 services if down

#### **2. Nginx Config Protection** (On-demand)
- **Script**: `/root/nginx-config-protection.sh`
- **Commands**: check, fix, backup, restore, monitor
- **Backups**: `/root/nginx-backups/`

#### **3. SSL Certificate Monitor** (Daily)
- **Script**: `/root/ssl-certificate-monitor.sh`
- **Cron**: `0 0 * * *`
- **Alert**: 30 days before expiry

#### **4. System Health Monitor** (Every 15 minutes)
- **Script**: `/root/system-health-monitor.sh`
- **Cron**: `*/15 * * * *`
- **Checks**: Nginx, PM2, disk, memory, site responses

---

### **Firestore Security Rules**

**Model**: Role-Based Access Control (RBAC)

**Roles**:
1. `authenticated` - Logged in users
2. `approved` - Users with status='approved'
3. `admin` - Users with role='admin'
4. `project_member` - Users in project.members array

**Key Security Features**:
- ✅ Users can only read/write their own profile
- ✅ Projects restricted to members
- ✅ Admin-only collections: brands, email_templates, roadmap
- ✅ Activity logs are immutable (append-only)
- ✅ Default deny-all for undefined paths

**Deploy Rules**:
```bash
firebase deploy --only firestore:rules
```

---

## 📦 Backup & Recovery

### **Configuration Backups**

#### **Nginx Configs**
```bash
# Create backup
/root/nginx-config-protection.sh backup

# Backups stored in
/root/nginx-backups/

# List backups
ls -lht /root/nginx-backups/

# Restore from backup
/root/nginx-config-protection.sh restore
```

#### **PM2 Process List**
```bash
# Save current state
sudo -u clientdash pm2 save

# Saved to
/home/clientdash/.pm2/dump.pm2

# Restore after reboot
sudo -u clientdash pm2 resurrect
```

---

### **Database Backups**

Firestore has automatic backups via Firebase console:
- **Location**: Firebase Console → Firestore → Backups
- **Retention**: As configured in Firebase project
- **Restore**: Use Firebase Console import/export

---

## 🔧 Configuration Files

### **Critical File Locations**

```bash
# Application
/home/clientdash/client-dashboard/              # Main app
/home/clientdash/client-dashboard/api/server.ts # API entry
/home/clientdash/client-dashboard/ecosystem.config.js # PM2 config

# Nginx
/etc/nginx/conf.d/default.conf                  # HTTP config
/etc/nginx/conf.d/default_https.conf            # HTTPS config

# PM2
/home/clientdash/.pm2/dump.pm2                  # Saved processes
/home/clientdash/.pm2/logs/                     # PM2 logs

# Monitoring Scripts
/root/nginx-config-protection.sh                # Config protection
/root/ssl-certificate-monitor.sh                # SSL monitoring
/root/system-health-monitor.sh                  # Health checks
/home/clientdash/client-dashboard/pm2-healthcheck.sh # PM2 watchdog

# Logs
/var/log/nginx/                                 # Nginx logs
/var/log/system-health-monitor.log              # Health monitor
/var/log/ssl-certificate-monitor.log            # SSL monitor
/var/log/pm2-healthcheck.log                    # PM2 watchdog
/var/log/nginx-config-protection.log            # Config protection
```

---

### **Important Nginx Configuration**

#### **Dual-Stack Listeners (CRITICAL)**

**Correct Configuration**:
```nginx
# HTTP (port 80)
listen 80 default_server;
listen [::]:80 default_server ipv6only=on;

# HTTPS (port 443)
listen 443 ssl default_server;
listen [::]:443 ssl default_server ipv6only=on;
```

**NEVER use** `ipv6only=off` - causes dual-stack binding errors!

#### **Domain-Specific Blocks**

**client.samixism.com** (lines ~109-130 in default_https.conf):
```nginx
server {
    listen 443 ssl;              # IPv4
    listen [::]:443 ssl;         # IPv6
    http2 on;
    server_name client.samixism.com www.client.samixism.com;

    ssl_certificate /var/cpanel/ssl/apache_tls/client.samixism.com/combined;
    ssl_certificate_key /var/cpanel/ssl/apache_tls/client.samixism.com/combined;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        # ... proxy headers
    }

    # API
    location /api {
        proxy_pass http://127.0.0.1:3001;
        # ... proxy headers
    }
}
```

---

## 📈 Monitoring & Alerts

### **Manual Health Checks**

```bash
# Full system health
/root/system-health-monitor.sh

# SSL certificates
/root/ssl-certificate-monitor.sh

# Nginx configuration
/root/nginx-config-protection.sh check

# PM2 services
sudo -u clientdash pm2 list
sudo -u clientdash pm2 monit
```

### **Automated Monitoring Schedule**

| Check | Frequency | Script |
|-------|-----------|--------|
| PM2 Health | Every 5 minutes | pm2-healthcheck.sh |
| System Health | Every 15 minutes | system-health-monitor.sh |
| SSL Certificates | Daily (midnight) | ssl-certificate-monitor.sh |

---

## 🚨 Emergency Procedures

### **Complete Service Outage**

```bash
# 1. Check all services
systemctl status nginx
sudo -u clientdash pm2 list
netstat -tulpn | grep -E ':(80|443|3000|3001)'

# 2. Restart everything
systemctl restart nginx
cd /home/clientdash/client-dashboard
sudo -u clientdash pm2 restart all

# 3. Verify recovery
/root/system-health-monitor.sh
curl -I https://client.samixism.com
curl -I https://mauboussin.ma
```

### **Corrupted Nginx Configuration**

```bash
# 1. Test current config
nginx -t

# 2. If test fails, restore from backup
/root/nginx-config-protection.sh restore

# 3. Verify restoration
nginx -t

# 4. Reload Nginx
systemctl reload nginx

# 5. Verify sites
curl -I https://client.samixism.com
curl -I https://mauboussin.ma
```

### **PM2 Won't Start**

```bash
# 1. Kill all PM2 processes
sudo -u clientdash pm2 kill

# 2. Start fresh
cd /home/clientdash/client-dashboard
sudo -u clientdash pm2 start ecosystem.config.js

# 3. Save state
sudo -u clientdash pm2 save

# 4. Verify
sudo -u clientdash pm2 list
```

---

## 📞 Support Contacts

- **Firebase Console**: https://console.firebase.google.com
- **Server Provider**: (Add hosting provider details)
- **DNS Management**: (Add DNS provider details)
- **SSL Provider**: cPanel AutoSSL (managed by hosting)

---

## 📝 Change Log

### Version 1.0.0 (2026-02-13)
- Initial production deployment
- Node.js v20.20.0 LTS installed
- Nginx dual-stack configuration
- PM2 health monitoring
- SSL certificate monitoring
- System health monitoring
- Firestore RBAC security rules

---

## 🎯 Known Issues & Workarounds

### **Issue 1: Engintron May Reset Configs**
- **Impact**: Low (monitoring in place)
- **Workaround**: Run `/root/nginx-config-protection.sh fix`
- **Prevention**: Automated backup every config change

### **Issue 2: Rate Limit Warning in API Logs**
- **Impact**: None (cosmetic)
- **Message**: "X-Forwarded-For header with trust proxy=false"
- **Status**: Non-blocking, API functions normally

---

## ✅ Pre-Deployment Checklist

Before any major update:

- [ ] Backup Nginx configs: `/root/nginx-config-protection.sh backup`
- [ ] Save PM2 state: `sudo -u clientdash pm2 save`
- [ ] Test Nginx config: `nginx -t`
- [ ] Check disk space: `df -h`
- [ ] Verify Node.js version: `node --version` (should be v20+)
- [ ] Review recent logs for errors
- [ ] Verify both sites accessible
- [ ] Check SSL certificates valid

---

## 🎓 Training & Onboarding

### **For New Team Members**

1. **Read this runbook** thoroughly
2. **Access the server**: `ssh root@49.13.129.43`
3. **Run health check**: `/root/system-health-monitor.sh`
4. **Review logs**: See "View Logs" section
5. **Practice recovery**: Use test environment first

### **Key Concepts to Understand**

1. **Dual-Stack Networking**: Why `ipv6only=on` is critical
2. **PM2 Process Management**: Fork vs cluster mode
3. **Nginx Reverse Proxy**: How requests flow through the system
4. **Firestore RBAC**: Understanding the 4-tier permission model
5. **Automated Monitoring**: What each script does

---

**END OF RUNBOOK**

*Last reviewed: 2026-02-13*
*Next review: 2026-03-13*
