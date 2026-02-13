#!/bin/bash

#############################################
# Manual Rollback Script
# Run this on the VPS to rollback to a previous deployment
#############################################

set -e

DEPLOY_PATH="/var/www/client-samixism"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo_success() { echo -e "${GREEN}✓ $1${NC}"; }
echo_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
echo_error() { echo -e "${RED}✗ $1${NC}"; }

echo "=== Client Dashboard - Manual Rollback ==="
echo ""

# Check if running as correct user
if [ "$(whoami)" != "clientdash" ]; then
    echo_error "This script must be run as user: clientdash"
    exit 1
fi

# Show available backups
echo "Available backups:"
echo ""
cd $DEPLOY_PATH/backups
ls -lt | head -10
echo ""

# Show available releases
echo "Available releases:"
echo ""
cd $DEPLOY_PATH/releases
ls -lt | head -10
echo ""

# Prompt for rollback choice
echo "Choose rollback method:"
echo "1) Rollback to latest backup"
echo "2) Rollback to specific backup"
echo "3) Rollback to specific release"
echo "4) Cancel"
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        # Rollback to latest backup
        cd $DEPLOY_PATH/backups
        LATEST_BACKUP=$(ls -t | head -n1)

        if [ -z "$LATEST_BACKUP" ]; then
            echo_error "No backups found!"
            exit 1
        fi

        echo_warning "Rolling back to latest backup: $LATEST_BACKUP"
        read -p "Are you sure? (yes/no): " confirm

        if [ "$confirm" != "yes" ]; then
            echo_error "Rollback cancelled"
            exit 0
        fi

        # Stop PM2 processes
        echo "Stopping PM2 processes..."
        cd $DEPLOY_PATH/current
        pm2 delete all || true

        # Remove current symlink
        rm -rf $DEPLOY_PATH/current

        # Copy backup to current
        cp -r $DEPLOY_PATH/backups/$LATEST_BACKUP $DEPLOY_PATH/current

        # Restart PM2
        cd $DEPLOY_PATH/current
        pm2 start ecosystem.config.js
        pm2 save

        echo_success "Rollback completed to: $LATEST_BACKUP"
        ;;

    2)
        # Rollback to specific backup
        read -p "Enter backup directory name: " BACKUP_NAME

        if [ ! -d "$DEPLOY_PATH/backups/$BACKUP_NAME" ]; then
            echo_error "Backup not found: $BACKUP_NAME"
            exit 1
        fi

        echo_warning "Rolling back to backup: $BACKUP_NAME"
        read -p "Are you sure? (yes/no): " confirm

        if [ "$confirm" != "yes" ]; then
            echo_error "Rollback cancelled"
            exit 0
        fi

        # Stop PM2 processes
        echo "Stopping PM2 processes..."
        cd $DEPLOY_PATH/current
        pm2 delete all || true

        # Remove current symlink
        rm -rf $DEPLOY_PATH/current

        # Copy backup to current
        cp -r $DEPLOY_PATH/backups/$BACKUP_NAME $DEPLOY_PATH/current

        # Restart PM2
        cd $DEPLOY_PATH/current
        pm2 start ecosystem.config.js
        pm2 save

        echo_success "Rollback completed to: $BACKUP_NAME"
        ;;

    3)
        # Rollback to specific release
        read -p "Enter release commit SHA: " RELEASE_SHA

        if [ ! -d "$DEPLOY_PATH/releases/$RELEASE_SHA" ]; then
            echo_error "Release not found: $RELEASE_SHA"
            exit 1
        fi

        echo_warning "Rolling back to release: $RELEASE_SHA"
        read -p "Are you sure? (yes/no): " confirm

        if [ "$confirm" != "yes" ]; then
            echo_error "Rollback cancelled"
            exit 0
        fi

        # Update symlink
        ln -sfn $DEPLOY_PATH/releases/$RELEASE_SHA $DEPLOY_PATH/current

        # Reload PM2
        cd $DEPLOY_PATH/current
        pm2 reload ecosystem.config.js
        pm2 save

        echo_success "Rollback completed to: $RELEASE_SHA"
        ;;

    4)
        echo_error "Rollback cancelled"
        exit 0
        ;;

    *)
        echo_error "Invalid choice"
        exit 1
        ;;
esac

# Wait for startup
echo "Waiting for application to start..."
sleep 5

# Health check
echo "Running health check..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
    echo_success "Health check passed! Application is running."
else
    echo_error "Health check failed! Status code: $HEALTH_STATUS"
    echo "Check logs with: pm2 logs"
    exit 1
fi

echo ""
echo "=== Rollback Complete ==="
echo ""
echo "Useful commands:"
echo "  pm2 status       # Check process status"
echo "  pm2 logs         # View logs"
echo "  pm2 monit        # Real-time monitoring"
echo ""
