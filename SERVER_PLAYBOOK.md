# Server Playbook & Architecture Rules

This document outlines the exact architecture of our production VPS (cPanel + Engintron + PM2) and the **critical rules** that must be followed when adding new domains, fixing SSL, or routing Node/Next.js apps. Following these prevents hours of debugging, tested against real production failures.

---

## 1. How Engintron Works (Read This First)

Our server runs **cPanel/WHM** with **Engintron** installed as the edge reverse proxy.

| Layer                 | Port                   | Manages                                           |
| --------------------- | ---------------------- | ------------------------------------------------- |
| **Engintron (Nginx)** | 80, 443                | All public traffic — owns these ports exclusively |
| **Apache (httpd)**    | 8080, 8443             | cPanel-managed sites — Nginx proxies to it        |
| **PM2 processes**     | 3000, 3001, 3010, etc. | Node/Vite/Next.js apps — Nginx proxies to them    |

**Engintron auto-generates two critical files from cPanel user data:**

- `/etc/nginx/conf.d/default.conf` → HTTP vhosts
- `/etc/nginx/conf.d/default_https.conf` → HTTPS vhosts

> ⚠️ **NEVER edit `default.conf` or `default_https.conf` directly.**  
> Engintron regenerates them on every restart and will wipe your edits.

**The only file you should ever add rules to:**

```
/etc/nginx/conf.d/custom_rules.conf
```

Blocks in `custom_rules.conf` load _before_ the auto-generated files, acting as overrides.

---

## 2. Adding a New Domain or Subdomain (PM2 / Node / Next.js)

When you add a new PM2 app (e.g., a Next.js or Vite app on a local port), you need to:

**Step 1:** Create the subdomain in cPanel so Engintron generates an underlying vhost.

**Step 2:** Add a custom server block to `custom_rules.conf`:

```nginx
# /etc/nginx/conf.d/custom_rules.conf

server {
    listen [::]:443 ssl;   # ⚠️ ONLY this — do NOT add a separate "listen 443 ssl;" line
    http2 on;
    server_name your-subdomain.samixism.com;

    # Let's Encrypt cert (see Section 3 below for how to generate this)
    ssl_certificate /etc/letsencrypt/live/your-subdomain.samixism.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-subdomain.samixism.com/privkey.pem;

    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;   # CRITICAL — Next.js/Vite need this or they redirect-loop
        proxy_set_header X-Forwarded-SSL on;         # CRITICAL
        proxy_pass http://127.0.0.1:YOUR_PORT;
    }
}
```

> ⚠️ **CRITICAL: `listen [::]:443 ssl;` only — never add `listen 443 ssl;` separately.**  
> Engintron's `default_https.conf` uses `listen [::]:443 ssl default_server ipv6only=off;` (dual-stack, covering IPv4 too).  
> Adding a separate `listen 443 ssl;` (IPv4-only) creates a socket conflict that **prevents nginx from starting after a full restart** while always passing `nginx -t`. The only sign is `bind() to [::]:443 failed (98: Address already in use)` at start time.

**Step 3:** Test and reload:

```bash
nginx -t && systemctl reload nginx
```

> 💡 **Use `reload` not `restart`.** `reload` (SIGHUP) applies new config without releasing sockets — much safer. Full `restart` releases all sockets and recreates them; any listen directive inconsistency will cause a bind failure and take the whole server down.

> ⚠️ **The `X-Forwarded-Proto https` header is non-negotiable for Next.js.**  
> Without it, Next.js sees plain HTTP internally and redirects every request to HTTPS, creating an infinite `ERR_INVALID_REDIRECT` loop. This is the most common misconfiguration on this server.

---

## 3. SSL Certificates (How to Actually Get Them Working)

### The Problem

cPanel AutoSSL uses its own DCV validation and stores fake "combined" cert files like:

```
/var/cpanel/ssl/apache_tls/yourdomain.com/combined
```

These are inserted into `default_https.conf`. Certbot's automated Nginx plugin sees them as conflicting and always fails with:

```
Problem in /etc/nginx/conf.d/default_https.conf: tried to insert directive
"ssl_certificate" but found conflicting "ssl_certificate ..."
```

### The Solution That Actually Works

**Step 1:** Generate the cert using `--nginx` but telling certbot NOT to install it:

```bash
certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com \
  --non-interactive --agree-tos -m admin@samixism.com
```

This saves the cert to `/etc/letsencrypt/live/yourdomain.com/` without touching Nginx.

**Step 2:** Add a custom server block in `custom_rules.conf` that points directly to the Let's Encrypt cert paths (see Section 2 above for the template). This bypasses the fake cPanel certs entirely because `custom_rules.conf` loads first.

**Step 3:** Reload Nginx:

```bash
nginx -t && systemctl reload nginx
```

That's it. No `sed` replacement needed on the generated files.

> ✅ **This is EXACTLY the approach that fixed `mauboussin.ma` and `client.samixism.com`.**

### Auto-renewal

Certbot registers a cron/systemd timer automatically. The certs expire every 90 days and renew automatically. Confirm with:

```bash
certbot renew --dry-run
```

---

## 4. CORS for Static Assets on a Different Subdomain

If Domain A (e.g., `client.samixism.com`) loads JavaScript from Domain B (e.g., `billing.samixism.com`), the browser will block it with a CORS error **even if you add headers to your proxy config**.

### Why normal proxy header fixes don't work here

Engintron has a static file cache layer (`common_http.conf` / `common_https.conf`) that intercepts all requests for `.js`, `.css`, `.png`, etc. and serves them directly from disk — completely bypassing any `proxy_pass` block and its associated headers.

### The Fix: Inject into the Cache Layer

```bash
find /etc/nginx -type f -name "common_*.conf" \
  -exec sed -i '/expires max;/a \    add_header Access-Control-Allow-Origin * always;\n    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;' {} +

nginx -t && systemctl reload nginx
```

---

## 5. Debugging Quick Reference

| Symptom                             | Root Cause                                              | Fix                                                           |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| `ERR_INVALID_REDIRECT` on domain    | Missing `X-Forwarded-Proto https` header                | Add header to location block in `custom_rules.conf`           |
| `ERR_CERT_COMMON_NAME_INVALID`      | Nginx serving wrong/stub cPanel cert                    | Run `certbot certonly` + add custom server block with LE cert |
| CORS error on `.js` / `.css` assets | Engintron static cache bypasses proxy headers           | Inject headers after `expires max;` in `common_*.conf`        |
| `bind() to [::]:443 failed (98)`    | Dual `listen 443 ssl;` + `listen [::]:443 ssl;` conflicts with Engintron's dual-stack socket | Remove `listen 443 ssl;` lines — use ONLY `listen [::]:443 ssl;` per server block |
| nginx won't start after restart     | `nginx -t` passes but start fails — socket inconsistency | Check `ss -anp \| grep 443`; see listen directive rule above |
| `ipv6only` duplicate error          | `listen [::]:443 ssl ipv6only=off;` in multiple server blocks | Only ONE server block may specify socket-level options like `ipv6only` |
| Works in Incognito, fails in Chrome | Chrome cached the redirect loop locally                 | Right-click Refresh → **Empty Cache and Hard Reload**         |
| Certbot fails to install cert       | Conflicts with cPanel stub cert in `default_https.conf` | Use `certonly` flag + custom server block instead             |

---

## 6. Dual-Port PM2 Architecture

The Client Dashboard runs **two separate PM2 processes** on the same VPS:

| Process                | Port | Purpose                               |
| ---------------------- | ---- | ------------------------------------- |
| `client-dashboard`     | 3000 | Vite frontend (static SPA)            |
| `client-dashboard-api` | 3001 | Express API server (Drive, auth, etc) |

Both are managed via `ecosystem.config.js` in the project root.

### Nginx Routing Template

The following location blocks must exist inside the `client.samixism.com` server block in `/etc/nginx/conf.d/custom_rules.conf`. Order matters — more-specific paths first:

```nginx
# API routes → Express on 3001
location /api/ {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-SSL on;
    proxy_pass http://127.0.0.1:3001;
    client_max_body_size 210m;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    proxy_connect_timeout 60s;
}

# Admin API routes → Express on 3001
location /admin/api/ {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-SSL on;
    proxy_pass http://127.0.0.1:3001;
}

# Catch-all → Vite frontend on 3000 (MUST be last)
location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-SSL on;
    proxy_pass http://127.0.0.1:3000;
}
```

### Google Drive Environment Variables

The API server requires the following environment variables for Google Drive integration. Set them in `/home/clientdash/client-dashboard/shared/.env` or in the `env_production` block of `ecosystem.config.js`:

| Variable                      | Required | Description                                   |
| ----------------------------- | -------- | --------------------------------------------- |
| `GOOGLE_SERVICE_ACCOUNT_PATH` | One of…  | Path to the service account JSON key file     |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | …these   | Inline JSON string of the service account key |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Yes      | ID of the root folder for file storage        |

> ⚠️ **NEVER commit `service-account.json` to git.** Ensure it is listed in `.gitignore`.

> ⚠️ **The service account email must have Editor access to the root folder** (`GOOGLE_DRIVE_ROOT_FOLDER_ID`) in the Google Drive UI, otherwise `initializeDrive()` will fail with a `403 PERMISSION_DENIED` error.

### PM2 Reload Commands

```bash
# Reload API server (picks up new .env vars)
pm2 reload client-dashboard-api --update-env

# Reload frontend
pm2 reload client-dashboard --update-env

# Check status
pm2 status
```

---

## 7. Docker Services on This Server

### Postiz — Social Media Scheduler (`social.samixism.com`)

**Location:** `/home/clientdash/postiz-docker/`  
**Port:** `127.0.0.1:4007 → container:5000`

Postiz requires **5 containers**. The Temporal workflow engine needs Elasticsearch for its visibility store — without it, Temporal fails with `cannot have more than 3 search attribute of type Text`.

| Container | Image | Purpose |
|---|---|---|
| `postiz` | `ghcr.io/gitroomhq/postiz-app:latest` | Main app (frontend + backend + orchestrator) |
| `postiz-postgres` | `postgres:17-alpine` | Database |
| `postiz-redis` | `redis:7.2` | Queue / cache |
| `postiz-temporal` | `temporalio/auto-setup:1.24.2` | Workflow engine — must use `DB=postgres12` |
| `postiz-elasticsearch` | `elasticsearch:8.10.4` | Temporal visibility store (required!) |

**Key `.env` settings:**
```
MAIN_URL=https://social.samixism.com
FRONTEND_URL=https://social.samixism.com
NEXT_PUBLIC_BACKEND_URL=https://social.samixism.com/api
BACKEND_INTERNAL_URL=http://localhost:3000
TEMPORAL_ADDRESS=temporal:7233
IS_GENERAL=true
```

**Manage:**
```bash
cd /home/clientdash/postiz-docker
docker compose ps              # status
docker compose logs postiz --tail=20  # app logs
docker compose restart postiz  # restart app only
docker compose down && docker compose up -d  # full restart
```

> ⚠️ **Temporal DB driver must be `DB=postgres12`** (not `postgresql14` — that driver name is invalid).  
> ⚠️ **Do NOT drop the postgres volume** unless you intend to wipe all Postiz data (users, connected accounts, scheduled posts).
