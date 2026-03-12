# PRD: Integrate Postiz Social Media Scheduling into Client Dashboard

**Version**: 1.0.0  
**Date**: 2026-03-10  
**Status**: Draft — Awaiting Review

---

## 1. Problem Statement

The Client Dashboard currently provides project management, file management, feedback tools, and collaboration features. However, clients need a **unified social media scheduling and publishing** solution integrated within the same ecosystem. Today, they rely on external tools (Buffer, Hootsuite, etc.) — creating context-switching, extra costs, and fragmented workflows.

**Business Impact**: Adding social media management directly into the client dashboard creates a sticky, all-in-one platform that increases daily active usage, reduces churn, and opens new monetization opportunities.

---

## 2. Target Users

| Persona             | Description                                                                        |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Agency Clients**  | Marketing teams who manage social media for brands and need scheduling + analytics |
| **Brand Managers**  | Internal marketing leads who publish across multiple channels                      |
| **Freelancers**     | Solo creators managing content for multiple clients                                |
| **Dashboard Admin** | Server administrator who deploys and maintains the self-hosted instance            |

---

## 3. Proposed Solution

Self-host [Postiz](https://github.com/gitroomhq/postiz-app) (AGPL-3.0) on the existing VPS (`49.13.129.43`) as a **Docker Compose stack** running on a dedicated subdomain (`social.samixism.com`). Integrate it into the Client Dashboard via navigation links, iframe embedding, or API-driven UI.

### 3.1 What is Postiz?

Postiz is an open-source, AI-powered social media scheduling tool with:

- **20+ social platform integrations**: X (Twitter), LinkedIn, Facebook, Instagram, Threads, TikTok, YouTube, Reddit, Pinterest, Discord, Slack, Bluesky, Mastodon, Telegram, Google My Business, Dribbble, Skool, Whop
- **AI content generation** (OpenAI-powered)
- **Team collaboration** with workspaces
- **Media management** with local or cloud storage (Cloudflare R2 / S3)
- **Workflow automation** via Temporal orchestration
- **Public API + Node.js SDK + n8n + Make.com integrations**

### 3.2 Postiz Architecture

Postiz runs as a **mono-container** (`ghcr.io/gitroomhq/postiz-app:latest`) bundling three internal services:

| Internal Service | Role                                          |
| ---------------- | --------------------------------------------- |
| **Frontend**     | Next.js React UI                              |
| **Backend**      | NestJS API (Express-based)                    |
| **Orchestrator** | Temporal worker for scheduled post publishing |

**External dependencies** (all containerized via Docker Compose):

| Service                  | Image                          | Purpose                           |
| ------------------------ | ------------------------------ | --------------------------------- |
| `postiz-postgres`        | `postgres:17-alpine`           | Application database              |
| `postiz-redis`           | `redis:7.2`                    | Caching & inter-service messaging |
| `temporal`               | `temporalio/auto-setup:1.28.1` | Workflow orchestration engine     |
| `temporal-postgresql`    | `postgres:16`                  | Temporal persistence              |
| `temporal-elasticsearch` | `elasticsearch:7.17.27`        | Temporal advanced visibility      |
| `temporal-ui`            | `temporalio/ui:2.34.0`         | Workflow monitoring dashboard     |
| `temporal-admin-tools`   | `temporalio/admin-tools`       | Temporal CLI management           |

**Ports**:

- Postiz app: internal `5000` → exposed as host `4007`
- Temporal UI: `8080` (remap to `8081` to avoid Apache conflict)
- PostgreSQL: `5432` (internal only)
- Redis: `6379` (internal only)
- Temporal gRPC: `7233` (internal only)

---

## 4. Server Architecture & Constraints

### 4.1 Current VPS State

| Resource            | Value                                                             |
| ------------------- | ----------------------------------------------------------------- |
| **Server**          | 49.13.129.43 (4 vCPU, 8GB RAM, 80GB disk)                         |
| **OS**              | CentOS + cPanel + Engintron                                       |
| **Domains**         | `client.samixism.com` (ports 3000/3001), `mauboussin.ma`          |
| **Web Server**      | Engintron (Nginx) → Apache (cPanel)                               |
| **Process Manager** | PM2 (`clientdash` user)                                           |
| **Ports in Use**    | 80, 443 (Nginx), 3000 (frontend), 3001 (API), 8080, 8443 (Apache) |

### 4.2 Key Server Rules (from SERVER_PLAYBOOK.md)

> **⚠️ CRITICAL**: These rules are non-negotiable.

1. **NEVER edit `default.conf` or `default_https.conf`** — Engintron regenerates them
2. **All custom Nginx rules go to `/etc/nginx/conf.d/custom_rules.conf`**
3. **Always pass `X-Forwarded-Proto https` and `X-Forwarded-SSL on`** to upstream apps
4. **SSL via `certbot certonly --nginx`** + custom server block pointing to Let's Encrypt certs
5. **Docker must coexist with cPanel** — ensure no port conflicts

### 4.3 Port Allocation Plan

| Service                   | Port | Status                            |
| ------------------------- | ---- | --------------------------------- |
| Client Dashboard Frontend | 3000 | ✅ In use                         |
| Client Dashboard API      | 3001 | ✅ In use                         |
| Postiz App                | 4007 | 🆕 Available                      |
| Temporal UI               | 8081 | 🆕 Available (remapped from 8080) |

### 4.4 Resource Budget

With 4 vCPU / 8GB RAM:

| Component                   | CPU           | RAM        |
| --------------------------- | ------------- | ---------- |
| Existing PM2 apps           | ~0.5 vCPU     | ~800MB     |
| Nginx + Apache + cPanel     | ~0.3 vCPU     | ~500MB     |
| Postiz + Redis + Postgres   | ~1 vCPU       | ~2GB       |
| Temporal + ES + Temporal-PG | ~1.5 vCPU     | ~3GB       |
| **Headroom**                | **~0.7 vCPU** | **~1.7GB** |

> **⚠️ WARNING**: Temporal + Elasticsearch is RAM-hungry. ES allocates 256–512MB heap. Monitor closely. If tight, reduce heap (`ES_JAVA_OPTS=-Xms128m -Xmx128m`) or skip ES with a lighter Temporal config.

---

## 5. Integration Strategy

### 5.1 Phase 1: Standalone Deployment (MVP)

Deploy Postiz as an **independent Docker Compose stack** on its own subdomain.

- **Subdomain**: `social.samixism.com`
- **Access**: Direct link from Client Dashboard sidebar
- **Auth**: Separate Postiz login (admin creates accounts)
- **Storage**: Local volumes initially, migrate to Cloudflare R2 later

### 5.2 Phase 2: Dashboard Integration

Embed Postiz within the Client Dashboard UI.

- Add "Social Media" navigation item in the sidebar
- Embed Postiz via `<iframe>` with SSO bridge OR use Postiz Public API for native React components
- Share brand assets between Dashboard file manager and Postiz media library

### 5.3 Phase 3: Deep Integration (Future)

- **Unified auth** via Firebase → Postiz OAuth bridge
- **Postiz API** consumed by Dashboard backend for scheduling from project views
- **Analytics dashboard** pulling Postiz metrics into the client dashboard
- **Webhook integration** for notifications on post publishing

---

## 6. Implementation Requirements

### 6.1 Infrastructure Setup

1. **Install Docker & Docker Compose** on the VPS (if not present)
2. **Create subdomain** `social.samixism.com` in cPanel
3. **Generate SSL** via `certbot certonly --nginx -d social.samixism.com`
4. **Add Nginx server block** in `/etc/nginx/conf.d/custom_rules.conf`
5. **Clone Postiz Docker Compose** repo to `/home/clientdash/postiz/`
6. **Configure `.env`** file with all required variables
7. **Start Docker Compose stack** with `docker compose up -d`
8. **Verify** all 8 services are healthy

### 6.2 Nginx Configuration (Postiz)

```nginx
# /etc/nginx/conf.d/custom_rules.conf — ADD this block

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name social.samixism.com;

    ssl_certificate /etc/letsencrypt/live/social.samixism.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/social.samixism.com/privkey.pem;

    client_max_body_size 100m;

    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-SSL on;
        proxy_pass http://127.0.0.1:4007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

### 6.3 Required Environment Variables

```env
# === Core
MAIN_URL=https://social.samixism.com
FRONTEND_URL=https://social.samixism.com
NEXT_PUBLIC_BACKEND_URL=https://social.samixism.com/api
BACKEND_INTERNAL_URL=http://localhost:3000
JWT_SECRET=<generate-with-openssl-rand-base64-64>

# === Database
DATABASE_URL=postgresql://postiz-user:postiz-password@postiz-postgres:5432/postiz-db-local
REDIS_URL=redis://postiz-redis:6379

# === Temporal
TEMPORAL_ADDRESS=temporal:7233

# === General
IS_GENERAL=true
DISABLE_REGISTRATION=true
RUN_CRON=true

# === Storage (local for MVP)
STORAGE_PROVIDER=local
UPLOAD_DIRECTORY=/uploads
NEXT_PUBLIC_UPLOAD_DIRECTORY=/uploads

# === AI (optional)
OPENAI_API_KEY=<your-key>

# === Social Media Keys (configure per-platform as needed)
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
# ... additional platforms as needed
```

### 6.4 Dashboard Frontend Changes

1. **Sidebar navigation**: Add "Social Media" link pointing to `https://social.samixism.com`
2. **New route** `/social` in the dashboard with iframe embed or redirect
3. **Icon**: Use Lucide `Share2` or `Megaphone` icon

---

## 7. Success Metrics

| Metric                                 | Target             | Measurement         |
| -------------------------------------- | ------------------ | ------------------- |
| Deployment uptime                      | >99.5%             | Docker healthchecks |
| Time to first scheduled post           | <10 minutes        | Manual tracking     |
| Social platforms connected per client  | ≥3                 | Postiz DB           |
| Posts scheduled per week (all clients) | ≥20                | Postiz analytics    |
| VPS resource utilization               | <85% CPU, <90% RAM | `htop` / monitoring |

---

## 8. Constraints

| Constraint                      | Impact                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| **AGPL-3.0 license**            | No modifications to Postiz source without open-sourcing. Self-hosting unmodified is fine. |
| **VPS resources**               | 8GB RAM is tight for Temporal + ES. May need RAM upgrade or lighter config.               |
| **Port 8080 conflict**          | Apache uses 8080/8443. Remap Temporal UI to 8081.                                         |
| **Docker + cPanel coexistence** | Docker networking must not conflict with cPanel/iptables rules.                           |
| **Social platform API keys**    | Each platform requires developer app registration — manual per-platform process.          |

---

## 9. Risks & Mitigations

| Risk                         | Likelihood | Impact | Mitigation                                                            |
| ---------------------------- | ---------- | ------ | --------------------------------------------------------------------- |
| Out of memory (OOM) kills    | Medium     | High   | Set ES heap limits, add swap, monitor with `system-health-monitor.sh` |
| Docker conflicts with cPanel | Low        | High   | Test in staging first, use dedicated Docker bridge network            |
| Temporal crashes under load  | Low        | Medium | Limit concurrent workflows, use Temporal UI for monitoring            |
| SSL cert issues              | Low        | Medium | Follow established `certbot certonly` playbook                        |
| Social API rate limits       | Medium     | Low    | Built-in rate limiting (API_LIMIT env var)                            |

---

## 10. Timeline Estimate

| Phase                               | Tasks                                                 | Duration    |
| ----------------------------------- | ----------------------------------------------------- | ----------- |
| **Phase 1: Infrastructure**         | Docker install, subdomain, SSL, Nginx                 | 1 day       |
| **Phase 2: Postiz Deployment**      | Docker Compose setup, env config, health verification | 1 day       |
| **Phase 3: Platform Configuration** | Social media API keys, user accounts, storage setup   | 2 days      |
| **Phase 4: Dashboard Integration**  | Sidebar link, route, iframe/redirect                  | 0.5 day     |
| **Phase 5: Testing & Hardening**    | E2E testing, monitoring scripts, backup procedures    | 1 day       |
| **Phase 6: Documentation**          | Update SERVER_PLAYBOOK, DEPLOYMENT_RUNBOOK            | 0.5 day     |
| **Total**                           |                                                       | **~6 days** |

---

## 11. Out of Scope (for this PRD)

- Custom Postiz UI modifications (use as-is)
- Building native social media components in the dashboard (Phase 3 future work)
- Firebase ↔ Postiz SSO bridge (Phase 3 future work)
- Postiz source code modifications (AGPL compliance)
- Multi-server deployment or load balancing
- Social media analytics dashboards within the client dashboard

---

## 12. Verification Plan

### 12.1 Automated Tests

- Docker Compose health: `docker compose ps` should show all 8 services as `healthy`
- Nginx config test: `nginx -t` succeeds after adding `social.samixism.com` block
- SSL verification: `curl -I https://social.samixism.com` returns 200
- Postiz API health: `curl https://social.samixism.com/api` returns valid response

### 12.2 Manual Verification

- Access `https://social.samixism.com` in browser — see Postiz login page
- Create first admin user — login succeeds
- Connect a social media account (e.g., X/Twitter) — OAuth flow completes
- Schedule a test post — appears in Postiz calendar
- Access Temporal UI at `https://social.samixism.com:8081` — see workflow history
- Verify VPS resource usage: `htop` shows <85% CPU, <90% RAM
- Click "Social Media" in client dashboard sidebar — navigates to Postiz
