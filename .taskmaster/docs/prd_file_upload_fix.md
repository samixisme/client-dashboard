Product Requirements Document: Fix File Upload System on client.samixism.com
==============================================================================

## Problem Statement

When users visit https://client.samixism.com/#/projects/managem-inside/files, they encounter two errors:

1. On page load (before any action): "Upload failed — API server is not reachable. Make sure both dev servers are running (npm run dev)."
2. On attempting to upload a file: Uncaught Error: "Invalid response from server" in driveUpload.js

The file management page is completely non-functional in production, blocking clients from uploading and viewing project files stored in Google Drive.

## Root Cause Analysis

The Node.js/Express API server runs on port 3001 (managed by PM2). The static frontend is served by `serve` on port 3000 (also PM2). In development, the Vite dev server proxies `/api` to localhost:3001 — but in production, this proxy doesn't exist.

The production Nginx `custom_rules.conf` only has a single catch-all location `/` that proxies everything to port 3000 (the static file server). There is NO separate `/api/` location block routing to port 3001 (the API server). So all API calls — like `GET /api/drive/files` and `POST /api/drive/upload` — return an HTML 404 page from `serve` instead of JSON from Express. The frontend checks for `Content-Type: application/json`, gets HTML, and shows the "not reachable" error.

Secondary issue: Even after fixing Nginx, if `GOOGLE_SERVICE_ACCOUNT_PATH` or `GOOGLE_SERVICE_ACCOUNT_JSON` env vars are not set on the server, the Google Drive initialization fails. There is currently no public health endpoint to diagnose this without SSH.

## Functional Requirements

### REQ-1: Nginx API Routing Fix (CRITICAL)
The production Nginx configuration (`/etc/nginx/conf.d/custom_rules.conf` on the VPS) must be updated to add a location block for `/api/` that proxies to the Express API server on port 3001. The catch-all `/` block should continue serving the static frontend on port 3000. The `/api/` block must set `client_max_body_size 210m` and `proxy_read_timeout 300s` / `proxy_send_timeout 300s` to support large file uploads up to 200MB.

### REQ-2: Admin API Routing Fix
Similarly, `/admin/api/` requests must be proxied to port 3001 (not the frontend static server).

### REQ-3: Drive Health Endpoint
A `GET /api/drive/health` endpoint must be added to `api/driveRoutes.ts` that:
- Calls `initializeDrive()` to test credential loading
- Returns `{ status: 'ok' }` (HTTP 200) on success
- Returns `{ status: 'error', message: string }` (HTTP 503) on failure
This allows diagnosing credential issues without SSH access.

### REQ-4: Deployment Procedure Documentation
The SERVER_PLAYBOOK.md must be updated to document the dual-port Nginx pattern (API on 3001, frontend on 3000), so future maintainers don't accidentally overwrite this.

### REQ-5: Verify Google Drive Credentials on Server
Confirm (via SSH or PM2 env check) that `GOOGLE_SERVICE_ACCOUNT_PATH` or `GOOGLE_SERVICE_ACCOUNT_JSON` is properly set in the production environment. Document where these must be set (either in `ecosystem.config.js` env block or in the shared `.env` file at `/home/clientdash/client-dashboard/shared/.env`).

## Non-Functional Requirements

- Response time for file listing: < 3 seconds for folders with up to 100 files
- Upload timeout: must support files up to 200MB without gateway timeout
- Health endpoint: must respond in < 5 seconds (Drive API ping)
- No downtime during deploy: Nginx reload is graceful (`nginx -t && systemctl reload nginx`)

## Acceptance Criteria

1. Visiting `https://client.samixism.com/#/projects/managem-inside/files` shows no error banner on load
2. `curl https://client.samixism.com/api/drive/health` returns `{"status":"ok"}` (HTTP 200)
3. `curl "https://client.samixism.com/api/drive/files?folder="` returns JSON array (not HTML)
4. Uploading a PDF or image file through the UI completes successfully (file appears in the list after upload)
5. `nginx -t` passes with no errors
6. TypeScript compilation (`npx tsc --noEmit`) has zero errors

## Implementation Tasks

### Task 1: Add Nginx location blocks for /api/ and /admin/api/
- Edit `/etc/nginx/conf.d/custom_rules.conf` on the VPS
- Add location /api/ → proxy_pass http://127.0.0.1:3001 with upload timeouts
- Add location /admin/api/ → proxy_pass http://127.0.0.1:3001
- Run: nginx -t && systemctl reload nginx
- Verify with curl

### Task 2: Add /api/drive/health endpoint
- Edit `api/driveRoutes.ts` in the project repo
- Add GET /health route that calls initializeDrive() and returns status
- Write unit test for the new route
- Deploy: npm run build:server && pm2 reload client-dashboard-api

### Task 3: Verify and document Google Drive credentials
- SSH to server, check pm2 env client-dashboard-api | grep GOOGLE
- If missing, add to ecosystem.config.js env block or shared .env
- Document the required env vars in SERVER_PLAYBOOK.md

### Task 4: Update SERVER_PLAYBOOK.md with dual-port architecture
- Add a new section "6. Dual-Port PM2 Architecture"
- Explain: frontend on 3000, API on 3001, how Nginx routes each
- Include the full custom_rules.conf template for this project

### Task 5: Smoke test and UAT
- Run curl tests against all /api/drive/* endpoints
- Upload a test file through the browser UI
- Check browser DevTools - confirm 201 JSON response on upload
- Update task statuses in Taskmaster to 'done'
