#!/bin/bash
# VPS Infrastructure Setup for CentOS/RHEL 8
# Server: 49.13.129.43 (server.samixism.com)
# Purpose: Setup client-dashboard deployment infrastructure

set -e  # Exit on error

echo "🚀 VPS Infrastructure Setup for client.samixism.com"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Create clientdash user
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Step 1: Creating clientdash user"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if id "clientdash" &>/dev/null; then
    echo -e "${YELLOW}⚠️  User 'clientdash' already exists${NC}"
    id clientdash
else
    echo "Creating user 'clientdash'..."
    useradd -m -s /bin/bash clientdash
    echo -e "${GREEN}✅ User 'clientdash' created${NC}"
fi

# 2. Add to wheel group (sudo privileges)
echo ""
echo "Adding to wheel group (sudo privileges)..."
usermod -aG wheel clientdash
echo -e "${GREEN}✅ User added to wheel group${NC}"
echo "User info:"
id clientdash

# 3. Create application directories
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Step 2: Creating application directories"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sudo -u clientdash mkdir -p /home/clientdash/client-dashboard/{releases,logs,.cache}
echo -e "${GREEN}✅ Directories created:${NC}"
ls -la /home/clientdash/client-dashboard/

# 4. Check/Install Node.js
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 3: Installing Node.js 18 LTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v node &>/dev/null; then
    NODE_VERSION=$(node -v)
    NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')

    echo -e "${YELLOW}Node.js $NODE_VERSION already installed${NC}"

    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo -e "${RED}⚠️  Node.js version is below 18. Upgrading...${NC}"
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        dnf install -y nodejs
        echo -e "${GREEN}✅ Node.js upgraded to $(node -v)${NC}"
    else
        echo -e "${GREEN}✅ Node.js version is 18 or higher${NC}"
    fi
else
    echo "Installing Node.js 18 LTS..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    dnf install -y nodejs
    echo -e "${GREEN}✅ Node.js installed: $(node -v)${NC}"
fi

echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"

# 5. Install PM2
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 4: Installing PM2 Process Manager"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v pm2 &>/dev/null; then
    echo -e "${YELLOW}⚠️  PM2 already installed: $(pm2 -v)${NC}"
else
    echo "Installing PM2 globally..."
    npm install -g pm2
    echo -e "${GREEN}✅ PM2 installed: $(pm2 -v)${NC}"
fi

# 6. Verify Nginx (don't install, just check)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Step 5: Verifying Nginx (existing installation)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v nginx &>/dev/null; then
    echo -e "${GREEN}✅ Nginx already installed: $(nginx -v 2>&1)${NC}"
    systemctl is-active --quiet nginx && echo -e "${GREEN}✅ Nginx is running${NC}" || echo -e "${YELLOW}⚠️  Nginx is not running${NC}"
else
    echo -e "${RED}⚠️  Nginx not found! Please install Nginx manually.${NC}"
fi

# 7. Configure firewalld (CentOS firewall)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 Step 6: Configuring firewalld"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if systemctl is-active --quiet firewalld; then
    echo -e "${GREEN}✅ firewalld is active${NC}"

    # Check if services are already added
    if firewall-cmd --list-services | grep -q "ssh"; then
        echo -e "${YELLOW}⚠️  SSH already allowed${NC}"
    else
        firewall-cmd --permanent --add-service=ssh
        echo -e "${GREEN}✅ SSH (port 22) allowed${NC}"
    fi

    if firewall-cmd --list-services | grep -q "http"; then
        echo -e "${YELLOW}⚠️  HTTP already allowed${NC}"
    else
        firewall-cmd --permanent --add-service=http
        echo -e "${GREEN}✅ HTTP (port 80) allowed${NC}"
    fi

    if firewall-cmd --list-services | grep -q "https"; then
        echo -e "${YELLOW}⚠️  HTTPS already allowed${NC}"
    else
        firewall-cmd --permanent --add-service=https
        echo -e "${GREEN}✅ HTTPS (port 443) allowed${NC}"
    fi

    # Reload firewall
    firewall-cmd --reload
    echo -e "${GREEN}✅ Firewall reloaded${NC}"

    echo ""
    echo "Current firewall configuration:"
    firewall-cmd --list-all
else
    echo -e "${YELLOW}⚠️  firewalld is not running${NC}"
    echo "Starting firewalld..."
    systemctl start firewalld
    systemctl enable firewalld

    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload

    echo -e "${GREEN}✅ firewalld configured and started${NC}"
fi

# 8. Generate SSH key for GitHub deployment
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Step 7: Generating SSH key for GitHub deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f /home/clientdash/.ssh/id_rsa ]; then
    echo -e "${YELLOW}⚠️  SSH key already exists${NC}"
else
    sudo -u clientdash ssh-keygen -t rsa -b 4096 -C "deploy@client.samixism.com" -N "" -f /home/clientdash/.ssh/id_rsa
    echo -e "${GREEN}✅ SSH key generated${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 GitHub Deploy Key (add this to GitHub repository)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo cat /home/clientdash/.ssh/id_rsa.pub
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 9. Setup PM2 startup
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Step 8: Configuring PM2 startup script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Generating PM2 startup script..."
sudo -u clientdash pm2 startup systemd -u clientdash --hp /home/clientdash

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Copy and run the command shown above to complete PM2 setup${NC}"

# Final verification
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SETUP COMPLETE - Verification Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "👤 User Info:"
id clientdash
echo ""
echo "🟢 Node.js: $(node -v)"
echo "🟢 npm: $(npm -v)"
echo "🟢 PM2: $(pm2 -v)"
echo "🟢 Nginx: $(nginx -v 2>&1)"
echo ""
echo "🔥 Firewall Status:"
firewall-cmd --list-all
echo ""
echo "📁 Application Directories:"
ls -la /home/clientdash/client-dashboard/
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Copy the SSH public key (shown above) to GitHub:"
echo "   Repository → Settings → Deploy keys → Add deploy key"
echo ""
echo "2. Configure GitHub Secrets:"
echo "   See GITHUB_SECRETS_GUIDE.md"
echo ""
echo "3. Get the VPS SSH private key for GitHub Actions:"
echo "   sudo cat /home/clientdash/.ssh/id_rsa"
echo ""
echo "4. Configure Nginx server block:"
echo "   See DEPLOYMENT.md Section 5"
echo ""
echo "5. Deploy application:"
echo "   See DEPLOYMENT.md Section 6"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ VPS Infrastructure Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
