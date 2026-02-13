#!/bin/bash
# Nginx Configuration Safety Check
# Run this BEFORE creating new configuration to verify existing sites won't be affected

set -e

echo "🔍 Nginx Configuration Safety Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Please run as root or with sudo"
    exit 1
fi

# 1. List all Nginx configuration files
echo "📁 Step 1: Listing Nginx configuration files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Main config directory:"
ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "Directory /etc/nginx/conf.d/ not found"
echo ""

echo "Sites available:"
ls -la /etc/nginx/sites-available/ 2>/dev/null || echo "Directory /etc/nginx/sites-available/ not found"
echo ""

echo "Sites enabled:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "Directory /etc/nginx/sites-enabled/ not found"
echo ""

# 2. Search for all server_name directives
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Step 2: Finding all configured domains (server_name directives)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Searching in /etc/nginx/..."
grep -r "server_name" /etc/nginx/ 2>/dev/null | grep -v "#" | sort -u
echo ""

# 3. Check if client.samixism.com is already configured
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Step 3: Checking if client.samixism.com already exists"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if grep -r "client.samixism.com" /etc/nginx/ 2>/dev/null; then
    echo ""
    echo "⚠️  WARNING: client.samixism.com is already configured!"
    echo "Review the configuration above before proceeding."
else
    echo "✅ client.samixism.com is NOT currently configured"
    echo "Safe to create new configuration."
fi
echo ""

# 4. Check listening ports
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 Step 4: Checking listening ports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Port 80 (HTTP):"
grep -r "listen.*80" /etc/nginx/ 2>/dev/null | grep -v "#" | head -10
echo ""

echo "Port 443 (HTTPS):"
grep -r "listen.*443" /etc/nginx/ 2>/dev/null | grep -v "#" | head -10
echo ""

# 5. Check if ports 3000 and 3001 are free
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 Step 5: Checking if application ports are available"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking port 3000 (frontend):"
if netstat -tuln 2>/dev/null | grep -q ":3000"; then
    echo "⚠️  Port 3000 is already in use"
    netstat -tuln | grep ":3000"
else
    echo "✅ Port 3000 is available"
fi
echo ""

echo "Checking port 3001 (API):"
if netstat -tuln 2>/dev/null | grep -q ":3001"; then
    echo "⚠️  Port 3001 is already in use"
    netstat -tuln | grep ":3001"
else
    echo "✅ Port 3001 is available"
fi
echo ""

# 6. Test current Nginx configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Step 6: Testing current Nginx configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

nginx -t
echo ""

# 7. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Nginx configuration is valid"
echo "✅ Safety check complete"
echo ""
echo "Next steps:"
echo "1. Review the output above"
echo "2. Confirm existing domains will not be affected"
echo "3. Proceed with creating /etc/nginx/conf.d/client-dashboard.conf"
echo ""
