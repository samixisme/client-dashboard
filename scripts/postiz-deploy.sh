#!/bin/bash
# VPS Deployment Script for Postiz (Task: DES-177)
# Run this on the VPS (49.13.129.43) as the 'clientdash' user.
# Ensure Docker and Docker Compose v2.x are installed before running.

set -e

echo "=== DES-182: Preparing VPS environment ==="
mkdir -p /home/clientdash/postiz/
chmod 755 /home/clientdash/postiz/
# Depending on the system, ensure clientdash owns the folder. Assuming running as clientdash so no chown needed.

cd /home/clientdash/postiz/

echo "=== DES-183: Cloning Postiz repository ==="
if [ -z "$(ls -A /home/clientdash/postiz/)" ]; then
  git clone https://github.com/gitroomhq/postiz-app.git .
else
  echo "Directory not empty, skipping clone."
fi

# Validate docker-compose.yml syntax
sudo docker compose -f docker-compose.yml config > /dev/null

echo "=== DES-185: Configuring environment variables ==="
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

cat <<EOF > .env
MAIN_URL=https://social.samixism.com
FRONTEND_URL=https://social.samixism.com
NEXT_PUBLIC_BACKEND_URL=https://social.samixism.com/api
BACKEND_INTERNAL_URL=http://localhost:3000
DATABASE_URL=postgresql://postiz-user:${DB_PASSWORD}@postiz-postgres:5432/postiz-db-local
REDIS_URL=redis://postiz-redis:6379
TEMPORAL_ADDRESS=temporal:7233
JWT_SECRET=${JWT_SECRET}
IS_GENERAL=true
DISABLE_REGISTRATION=true
RUN_CRON=true
STORAGE_PROVIDER=local
UPLOAD_DIRECTORY=/uploads
NEXT_PUBLIC_UPLOAD_DIRECTORY=/uploads
OPENAI_API_KEY=
X_API_KEY=
X_API_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
TIKTOK_CLIENT_ID=
TIKTOK_CLIENT_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
EOF

chmod 600 .env
if ! grep -q "^.env$" .gitignore; then
  echo ".env" >> .gitignore
fi

echo "=== DES-188: Starting Docker Compose stack ==="
sudo docker compose -f docker-compose.yml up -d --no-start
sudo docker compose -f docker-compose.yml up -d

echo "Waiting for services to start..."
sleep 15

echo "=== DES-192: Verifying Stack Health ==="
sudo docker compose ps
sudo docker compose exec -T postiz-redis redis-cli PING || echo "Redis ping failed"

echo "=== Deployment script complete. ==="
echo "Please follow up manually to verify connectivity across the components."
