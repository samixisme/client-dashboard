#!/bin/bash

# /**
#  * Nginx Configuration Protection Script
#  * Monitors and protects critical ipv6only fixes from accidental reversion
#  *
#  * @version    1.0.0
#  * @created    2026-02-13
#  * @purpose    Ensure ipv6only=on settings persist across Engintron updates
#  */

set -euo pipefail

# Configuration
NGINX_CONF_DIR="/etc/nginx/conf.d"
DEFAULT_HTTP="${NGINX_CONF_DIR}/default.conf"
DEFAULT_HTTPS="${NGINX_CONF_DIR}/default_https.conf"
BACKUP_DIR="/root/nginx-backups"
LOG_FILE="/var/log/nginx-config-protection.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function: Check if ipv6only=off exists (BAD)
check_ipv6_config() {
    local file=$1
    local filename=$(basename "$file")

    if grep -q "ipv6only=off" "$file" 2>/dev/null; then
        log "${RED}⚠️  WARNING: Found ipv6only=off in ${filename}${NC}"
        return 1
    else
        log "${GREEN}✅ OK: ${filename} has correct ipv6only configuration${NC}"
        return 0
    fi
}

# Function: Fix ipv6only=off to ipv6only=on
fix_ipv6_config() {
    local file=$1
    local filename=$(basename "$file")

    log "${YELLOW}🔧 Fixing ipv6only configuration in ${filename}...${NC}"

    # Create backup before modification
    cp "$file" "${BACKUP_DIR}/${filename}.before-fix-$(date +%Y%m%d-%H%M%S)"

    # Replace ipv6only=off with ipv6only=on
    sed -i 's/ipv6only=off/ipv6only=on/g' "$file"

    # Verify fix
    if check_ipv6_config "$file"; then
        log "${GREEN}✅ Successfully fixed ${filename}${NC}"
        return 0
    else
        log "${RED}❌ Failed to fix ${filename}${NC}"
        return 1
    fi
}

# Function: Ensure explicit IPv4+IPv6 listeners exist
ensure_dual_stack() {
    local file=$1
    local port=$2
    local filename=$(basename "$file")

    log "${YELLOW}🔍 Checking dual-stack listeners in ${filename}...${NC}"

    # Check for both IPv4 and IPv6 default listeners
    local has_ipv4=$(grep -c "listen ${port} .*default_server" "$file" || echo 0)
    local has_ipv6=$(grep -c "listen \[::\]:${port} .*default_server" "$file" || echo 0)

    if [[ $has_ipv4 -eq 0 ]] || [[ $has_ipv6 -eq 0 ]]; then
        log "${YELLOW}⚠️  Missing dual-stack listeners in ${filename}${NC}"
        log "   IPv4 listeners: ${has_ipv4}, IPv6 listeners: ${has_ipv6}"
        return 1
    else
        log "${GREEN}✅ OK: ${filename} has dual-stack listeners (IPv4: ${has_ipv4}, IPv6: ${has_ipv6})${NC}"
        return 0
    fi
}

# Function: Create backup of current working config
backup_working_config() {
    local timestamp=$(date +%Y%m%d-%H%M%S)

    log "${GREEN}💾 Creating backup of working configuration...${NC}"

    cp "$DEFAULT_HTTP" "${BACKUP_DIR}/default.conf.working-${timestamp}"
    cp "$DEFAULT_HTTPS" "${BACKUP_DIR}/default_https.conf.working-${timestamp}"

    log "${GREEN}✅ Backup created in ${BACKUP_DIR}${NC}"
}

# Function: Restore from backup
restore_from_backup() {
    log "${YELLOW}🔄 Restoring from most recent working backup...${NC}"

    # Find most recent working backup
    local latest_http=$(ls -t "${BACKUP_DIR}/default.conf.working-"* 2>/dev/null | head -1)
    local latest_https=$(ls -t "${BACKUP_DIR}/default_https.conf.working-"* 2>/dev/null | head -1)

    if [[ -n "$latest_http" ]] && [[ -n "$latest_https" ]]; then
        cp "$latest_http" "$DEFAULT_HTTP"
        cp "$latest_https" "$DEFAULT_HTTPS"

        # Test nginx config
        if nginx -t 2>&1 | grep -q "successful"; then
            systemctl reload nginx
            log "${GREEN}✅ Successfully restored from backup and reloaded Nginx${NC}"
            return 0
        else
            log "${RED}❌ Nginx config test failed after restore${NC}"
            return 1
        fi
    else
        log "${RED}❌ No backup files found in ${BACKUP_DIR}${NC}"
        return 1
    fi
}

# Function: Monitor and auto-fix
monitor_mode() {
    log "${GREEN}🔍 Starting continuous monitoring mode...${NC}"
    log "   Checking every 60 seconds for config changes"
    log "   Press Ctrl+C to stop"

    while true; do
        local needs_fix=0

        # Check both configs
        if ! check_ipv6_config "$DEFAULT_HTTP"; then
            fix_ipv6_config "$DEFAULT_HTTP"
            needs_fix=1
        fi

        if ! check_ipv6_config "$DEFAULT_HTTPS"; then
            fix_ipv6_config "$DEFAULT_HTTPS"
            needs_fix=1
        fi

        # Reload nginx if fixes were applied
        if [[ $needs_fix -eq 1 ]]; then
            log "${YELLOW}🔄 Reloading Nginx after fixes...${NC}"
            if nginx -t 2>&1 | grep -q "successful"; then
                systemctl reload nginx
                log "${GREEN}✅ Nginx reloaded successfully${NC}"
            else
                log "${RED}❌ Nginx config test failed - restoring from backup${NC}"
                restore_from_backup
            fi
        fi

        sleep 60
    done
}

# Main execution
main() {
    log "${GREEN}═══════════════════════════════════════════════════════${NC}"
    log "${GREEN}  Nginx Configuration Protection Script v1.0.0${NC}"
    log "${GREEN}═══════════════════════════════════════════════════════${NC}"

    case "${1:-check}" in
        check)
            log "🔍 Running configuration check..."
            check_ipv6_config "$DEFAULT_HTTP"
            check_ipv6_config "$DEFAULT_HTTPS"
            ensure_dual_stack "$DEFAULT_HTTP" "80"
            ensure_dual_stack "$DEFAULT_HTTPS" "443"
            ;;

        fix)
            log "🔧 Running auto-fix..."
            fix_ipv6_config "$DEFAULT_HTTP"
            fix_ipv6_config "$DEFAULT_HTTPS"

            # Test and reload
            if nginx -t 2>&1 | grep -q "successful"; then
                systemctl reload nginx
                log "${GREEN}✅ Nginx reloaded successfully${NC}"
            else
                log "${RED}❌ Nginx config test failed${NC}"
                exit 1
            fi
            ;;

        backup)
            backup_working_config
            ;;

        restore)
            restore_from_backup
            ;;

        monitor)
            monitor_mode
            ;;

        *)
            echo "Usage: $0 {check|fix|backup|restore|monitor}"
            echo ""
            echo "Commands:"
            echo "  check    - Check current configuration (default)"
            echo "  fix      - Auto-fix ipv6only=off issues"
            echo "  backup   - Create backup of current working config"
            echo "  restore  - Restore from most recent backup"
            echo "  monitor  - Continuous monitoring and auto-fix mode"
            echo ""
            exit 1
            ;;
    esac

    log "${GREEN}═══════════════════════════════════════════════════════${NC}"
}

main "$@"
