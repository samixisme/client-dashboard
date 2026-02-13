#!/bin/bash
# Nginx Configuration Setup for client.samixism.com
# Run as root: sudo bash nginx-setup.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🌐 Nginx Configuration Setup for client.samixism.com"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}⚠️  Please run as root or with sudo${NC}"
    exit 1
fi

# 1. Backup existing Nginx configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 Step 1: Creating backup of Nginx configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BACKUP_DIR="/root/nginx-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /etc/nginx/ "$BACKUP_DIR/"
echo -e "${GREEN}✅ Backup created at: $BACKUP_DIR${NC}"
echo ""

# 2. Check if configuration file exists
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Step 2: Checking configuration file"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CONFIG_SOURCE="./configs/nginx/client-dashboard.conf"
CONFIG_DEST="/etc/nginx/conf.d/client-dashboard.conf"

if [ ! -f "$CONFIG_SOURCE" ]; then
    echo -e "${RED}⚠️  Configuration file not found: $CONFIG_SOURCE${NC}"
    echo "Please ensure you're running this from the repository root"
    exit 1
fi

echo -e "${GREEN}✅ Configuration file found${NC}"
echo ""

# 3. Copy configuration file
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Step 3: Installing Nginx configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$CONFIG_DEST" ]; then
    echo -e "${YELLOW}⚠️  Configuration already exists, creating backup...${NC}"
    cp "$CONFIG_DEST" "$CONFIG_DEST.backup-$(date +%Y%m%d-%H%M%S)"
fi

cp "$CONFIG_SOURCE" "$CONFIG_DEST"
echo -e "${GREEN}✅ Configuration installed at: $CONFIG_DEST${NC}"
echo ""

# 4. Test Nginx configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Step 4: Testing Nginx configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if nginx -t; then
    echo ""
    echo -e "${GREEN}✅ Nginx configuration test passed${NC}"
else
    echo ""
    echo -e "${RED}❌ Nginx configuration test FAILED${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    rm "$CONFIG_DEST"
    if [ -f "$CONFIG_DEST.backup-"* ]; then
        cp "$CONFIG_DEST.backup-"* "$CONFIG_DEST"
    fi
    echo -e "${RED}Configuration not applied. Please check the errors above.${NC}"
    exit 1
fi
echo ""

# 5. Check if certbot is installed
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Step 5: Checking SSL certificate setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! command -v certbot &>/dev/null; then
    echo -e "${YELLOW}⚠️  certbot not installed${NC}"
    echo "Installing certbot..."

    # Install certbot for CentOS/RHEL
    if [ -f /etc/redhat-release ]; then
        dnf install -y certbot python3-certbot-nginx
    # Install certbot for Ubuntu/Debian
    elif [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    else
        echo -e "${RED}⚠️  Unknown OS. Please install certbot manually.${NC}"
    fi

    echo -e "${GREEN}✅ certbot installed${NC}"
else
    echo -e "${GREEN}✅ certbot already installed${NC}"
fi
echo ""

# 6. Reload Nginx (before SSL setup to allow certbot challenges)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Step 6: Reloading Nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
echo ""

# 7. Setup SSL certificate
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Step 7: Setting up SSL certificate with Let's Encrypt"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -d "/etc/letsencrypt/live/client.samixism.com" ]; then
    echo -e "${YELLOW}⚠️  SSL certificate already exists for client.samixism.com${NC}"
    echo "Certificate details:"
    certbot certificates -d client.samixism.com
    echo ""
    echo "To renew: certbot renew"
else
    echo "Obtaining SSL certificate..."
    echo ""
    echo -e "${YELLOW}NOTE: This will prompt you for:${NC}"
    echo "  1. Email address (for renewal notifications)"
    echo "  2. Terms of Service agreement"
    echo "  3. Whether to share email with EFF"
    echo ""

    # Run certbot
    certbot --nginx -d client.samixism.com

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ SSL certificate obtained and configured${NC}"
    else
        echo ""
        echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
        echo "Please check DNS settings and try again manually:"
        echo "  certbot --nginx -d client.samixism.com"
    fi
fi
echo ""

# 8. Setup automatic renewal
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Step 8: Setting up automatic SSL renewal"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Enable certbot timer for auto-renewal
systemctl enable certbot-renew.timer 2>/dev/null || systemctl enable certbot.timer 2>/dev/null || echo "Timer already enabled"
echo -e "${GREEN}✅ Automatic renewal configured${NC}"
echo ""

# 9. Final Nginx reload
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Step 9: Final Nginx reload"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

nginx -t && systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded with SSL configuration${NC}"
echo ""

# 10. Verification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuration Complete - Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📊 Nginx Status:"
systemctl status nginx --no-pager | head -10
echo ""

echo "🌐 Configured Domains:"
grep -r "server_name" /etc/nginx/conf.d/ | grep -v "#"
echo ""

echo "🔐 SSL Certificate:"
if [ -d "/etc/letsencrypt/live/client.samixism.com" ]; then
    certbot certificates -d client.samixism.com | grep -E "(Certificate Name|Domains|Expiry Date)"
else
    echo "  No certificate found (may need to run certbot manually)"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Nginx Configuration Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Verify application is running:"
echo "   sudo -u clientdash pm2 status"
echo ""
echo "2. Test HTTP redirect:"
echo "   curl -I http://client.samixism.com"
echo ""
echo "3. Test HTTPS:"
echo "   curl -I https://client.samixism.com"
echo ""
echo "4. Check existing sites are still accessible"
echo ""
echo "5. Monitor logs:"
echo "   tail -f /var/log/nginx/client-dashboard-access.log"
echo "   tail -f /var/log/nginx/client-dashboard-error.log"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
