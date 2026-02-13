#!/bin/bash
# Verify Nginx configuration and test that existing sites are not affected

set -e

echo "🔍 Nginx Configuration Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Test Nginx configuration
echo "📝 Step 1: Testing Nginx configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
nginx -t
echo ""

# 2. Check Nginx status
echo "📊 Step 2: Checking Nginx status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
systemctl status nginx --no-pager | head -10
echo ""

# 3. List all configured domains
echo "🌐 Step 3: All configured domains"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -r "server_name" /etc/nginx/ 2>/dev/null | grep -v "#" | sort -u
echo ""

# 4. Test client.samixism.com HTTP redirect
echo "🔗 Step 4: Testing HTTP → HTTPS redirect"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing: http://client.samixism.com"
curl -I http://client.samixism.com 2>&1 | head -15
echo ""

# 5. Test client.samixism.com HTTPS
echo "🔒 Step 5: Testing HTTPS connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing: https://client.samixism.com"
curl -I https://client.samixism.com 2>&1 | head -15
echo ""

# 6. Test API endpoint
echo "🔌 Step 6: Testing API endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing: https://client.samixism.com/api/health"
curl -I https://client.samixism.com/api/health 2>&1 | head -15
echo ""

# 7. Test health endpoint (direct)
echo "💓 Step 7: Testing health endpoint (direct backend)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing: http://localhost:3001/health"
curl http://localhost:3001/health 2>&1 || echo "API not running yet"
echo ""

# 8. Check SSL certificate
echo "🔐 Step 8: SSL Certificate information"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "/etc/letsencrypt/live/client.samixism.com" ]; then
    certbot certificates -d client.samixism.com
else
    echo "⚠️  SSL certificate not yet configured"
    echo "Run: certbot --nginx -d client.samixism.com"
fi
echo ""

# 9. Check listening ports
echo "🔌 Step 9: Checking listening ports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Nginx (80, 443):"
netstat -tuln | grep -E ":(80|443)" || ss -tuln | grep -E ":(80|443)"
echo ""
echo "Application (3000, 3001):"
netstat -tuln | grep -E ":(3000|3001)" || ss -tuln | grep -E ":(3000|3001)"
echo ""

# 10. Check log files
echo "📋 Step 10: Recent log entries"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Access log (last 5 lines):"
tail -5 /var/log/nginx/client-dashboard-access.log 2>/dev/null || echo "No access log yet"
echo ""
echo "Error log (last 5 lines):"
tail -5 /var/log/nginx/client-dashboard-error.log 2>/dev/null || echo "No error log yet"
echo ""

# 11. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Verification Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Quick Tests:"
echo ""
echo "Test from browser:"
echo "  http://client.samixism.com (should redirect to HTTPS)"
echo "  https://client.samixism.com (should load application)"
echo ""
echo "Check SSL rating:"
echo "  https://www.ssllabs.com/ssltest/analyze.html?d=client.samixism.com"
echo ""
echo "Monitor logs:"
echo "  tail -f /var/log/nginx/client-dashboard-access.log"
echo "  tail -f /var/log/nginx/client-dashboard-error.log"
echo ""
