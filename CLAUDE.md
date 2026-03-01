# Client Dashboard

A full-stack TypeScript client dashboard for managing projects, feedback, brands, and collaboration.

**Tech Stack:** React 18 + TypeScript + Vite + Firebase + Express proxy server

**Key Features:** Kanban boards, feedback annotation tool, moodboards, payments, calendar integration

---

## Quick Start

**Prerequisites:** Node.js, Firebase project

### Development

```bash
npm install
npm run dev  # Starts both Vite (port 3000) and Express API (port 3001)
```

**What runs concurrently:**

- Vite dev server: http://localhost:3000 (frontend)
- Express API server: http://localhost:3001 (proxy for feedback tool)
- API proxy auto-configured: `/api` → `http://localhost:3001`

### Environment Setup (Optional Security)

Create `.env` (gitignored):

```bash
# All optional - backward compatible without them
API_KEY=your-secret-key           # Enables API key auth on proxy
ALLOWED_ORIGINS=http://localhost:3000  # CORS restriction
RATE_LIMIT_MAX=100                # Requests per 15min
GEMINI_API_KEY=your-gemini-key    # For AI features
```

### Firebase Setup

1. Configure Firebase project in console
2. Update Firebase config in `utils/firebase.ts`
3. Deploy rules: `firestore.rules` and `storage.rules`
4. Deploy indexes: `firestore.indexes.json`
5. **Optional:** Run emulator: Check `firebase.json` for emulator config

### Testing

```bash
npm test              # Run Jest tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Production Build

```bash
npm run build  # Builds main app AND feedback.js widget, copies to public/
npm run serve  # Preview production build
```

---

## Architecture

### Directory Structure

```
src/
├── components/          # 14 feature-based directories
│   ├── admin/          # Admin CMS components
│   ├── board/          # Kanban board (3 views: kanban, list, table)
│   ├── feedback/       # Feedback annotation system
│   ├── moodboard/      # Canvas-based moodboards
│   └── layout/         # MainLayout (client) vs AdminLayout (CMS)
├── pages/              # 47+ route components
├── contexts/           # 7 React contexts (see nesting order below)
├── api/                # Express server (separate from Vite)
│   ├── server.ts       # Port 3001, Helmet + CORS + rate limiting
│   ├── proxy.ts        # Web scraping + feedback tool injection
│   ├── authMiddleware.ts  # Optional API key auth
│   └── urlValidator.ts    # SSRF protection
├── utils/              # firebase.ts, utility functions
└── types.ts            # 13,745 bytes - all TypeScript interfaces
```

### State Management: Context Nesting Order

**IMPORTANT:** Contexts MUST be nested in this exact order (see [App.tsx:239-247](App.tsx#L239-L247)):

```
NotificationHistoryProvider
  → UserProvider
    → AdminProvider
      → DataProvider (15KB - core app state)
        → TimerProvider
          → CalendarProvider
            → SearchProvider
```

### Dual Build System

Vite builds **two separate bundles** ([vite.config.ts:31-46](vite.config.ts#L31-L46)):

1. **Main app:** `index.html` → `dist/assets/main-[hash].js`
2. **Feedback widget:** `src/feedback-tool/index.tsx` → `dist/feedback.js` (no hash)
   - Standalone widget injected into external websites via proxy
   - Copied to `public/feedback.js` after build

### Routing Layout

Two completely separate layouts:

- `/admin/*` → AdminLayout (CMS for managing all data)
- All other routes → MainLayout (client-facing dashboard)

### TypeScript Configurations

**Two configs for different targets:**

- [tsconfig.json](tsconfig.json) → Frontend (ESNext, bundler resolution, react-jsx)
- [tsconfig.server.json](tsconfig.server.json) → Backend API (CommonJS, Node resolution)

### Data Access Patterns

Three conventions govern how pages fetch and mutate data:

| Layer | Pattern | Example |
|-------|---------|---------|
| **Client pages** | `DataContext` or a dedicated `use*` hook with `onSnapshot` for real-time data | `useProposals()` in [hooks/useProposals.ts](hooks/useProposals.ts) — returns `proposals`, `loading`, CRUD methods |
| **Admin pages** | `useAdminApi()` hook for REST calls to the Express API (`/admin/api/*`) | `get<User[]>('/users')` in [pages/admin/AdminUsersPage.tsx](pages/admin/AdminUsersPage.tsx) |
| **Prohibited** | Raw Firestore SDK calls (`addDoc`, `updateDoc`, `deleteDoc`) directly in page components | Refactored out of `ProposalsPage` in Task 95 |

**Rules:**
- Client-facing pages **must** use `DataContext` or a dedicated hook wrapping `onSnapshot`
- Admin CMS pages **must** use `useAdminApi` for all server communication
- Page components **must not** import `addDoc`, `updateDoc`, `deleteDoc`, or `onSnapshot` directly

---

## Key Features & Non-Obvious Patterns

### Custom Cursor Implementation

Global animated cursor with hover detection ([App.tsx:81-110](App.tsx#L81-L110)):

- Tracks mouse via `mousemove` listener
- Detects interactive elements: `a, button, [role="button"], input, select, textarea, [data-interactive="true"]`
- Two layers: `custom-cursor` (ring) + `custom-cursor-dot` (center)

### LiquidEther Background

WebGL fluid simulation using Three.js ([App.tsx:218-234](App.tsx#L218-L234)):

- Fixed position, z-index: -1
- Colors: lime green shades `['#A3E635', '#84CC16', '#65A30D']`
- 13 configuration parameters (mouseForce, viscous, iterationsPoisson, etc.)

### Feedback Tool Proxy Injection

**How it works ([api/proxy.ts](api/proxy.ts)):**

1. Frontend requests: `GET /api/proxy?url=https://example.com&projectId=123`
2. Express fetches external website
3. Cheerio parses HTML and rewrites all relative URLs to absolute
4. Removes CSP meta tags
5. Injects into `<body>`:
   - Tailwind CSS CDN
   - Custom feedback tool CSS (glass morphism, lime scrollbar)
   - Vite HMR client (dev only)
   - `/src/feedback-tool/index.tsx` script
6. Returns modified HTML to iframe

**Security:** SSRF protection blocks private IPs, localhost, metadata endpoints

### Authentication Flow

Three states with automatic routing ([App.tsx:113-157](App.tsx#L113-L157)):

1. **Unauthenticated:** Redirect to `/login`
2. **Pending approval:** User created in Firestore with `status: 'pending'` → `/pending-approval`
3. **Approved:** `status: 'approved'` → Full app access

**Email link (passwordless) auth:**

- `isSignInWithEmailLink()` detects return from email
- Email stored in localStorage as `emailForSignIn`

### Firebase Data Split

- **Firestore:** User profiles, real-time collaborative data
- **PostgreSQL (Data Connect):** See gotcha #3 below about schema mismatch
- **Storage:** File uploads (images, videos, attachments)

### Recurring Tasks Pattern

Tasks can repeat on schedule ([types.ts:38-44](types.ts#L38-L44)):

```typescript
recurring: {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval: 2,  // Every 2 weeks
  nextDueDate: '2025-02-01',
  repeatInStageId: 'stage-123',
  repeatOnlyWhenCompleted: true
}
```

### Video Annotation Layer

Feedback comments linked to video timestamps ([types.ts:98-99](types.ts#L98-L99)):

- `comment_timestamp_seconds` for playback sync
- `video_screenshot_url` for visual preview in timeline

---

## Testing

### Configuration

- **Framework:** Jest 30.2.0 with ts-jest preset
- **Environment:** jsdom (browser-like DOM)
- **Setup:** [jest.setup.ts](jest.setup.ts) mocks `window.matchMedia`, `IntersectionObserver`, `window.scrollTo`
- **Coverage targets:** `components/`, `pages/`, `contexts/`, `utils/`, `hooks/`

### Test Files

```
__tests__/
├── sample.test.tsx
├── utils.test.ts
├── calendarSync.test.ts
└── activityPersistence.test.ts
```

### Module Path Exclusions

AI assistant directories excluded from Jest resolution ([jest.config.ts:55-59](jest.config.ts#L55-L59)):

- `.agent/`, `.claude/`, `.gemini/` - Prevents naming collisions

---

## Gotchas & Warnings

### 1. Security Configuration is DEVELOPMENT-FRIENDLY

**Firestore Rules ([firestore.rules:14-16](firestore.rules#L14-L16)):**

```
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

⚠️ **Any authenticated user can read/write ALL collections** (except users collection which is UID-restricted)

- Intentional for rapid development
- **MUST be hardened before production**

### 2. Optional API Key Authentication

[api/authMiddleware.ts](api/authMiddleware.ts) is **backward compatible**:

- If `API_KEY` env var NOT set → No authentication required
- If set → Requires `X-API-Key` header or `apiKey` query param
- Allows gradual security rollout without breaking existing integrations

### 3. Data Connect Schema Mismatch ⚠️ HIGH PRIORITY TODO

[dataconnect/schema/schema.gql](dataconnect/schema/schema.gql) contains **movie review example** (User, Movie, Review)

- This is NOT the actual dashboard data model
- **TODO:** Schema needs updating to match dashboard entities
- Actual entities (Project, Board, Task, Brand, Feedback, Moodboard, etc.) defined in [types.ts](types.ts)
- Current schema is Firebase quickstart boilerplate and should be replaced

### 4. Concurrent Dev Servers Required

`npm run dev` uses `concurrently` to run TWO servers:

- Both must be running for full functionality
- Frontend alone won't work for feedback proxy features
- If one crashes, restart both with `npm run dev`

### 5. Context Provider Order Matters

Changing the nesting order of contexts in [App.tsx](App.tsx) will break the app

- DataProvider depends on UserProvider and AdminProvider
- SearchProvider must be innermost to access all other contexts

### 6. Vite Build Copies Feedback Widget

`npm run build` runs: `vite build && cp dist/feedback.js public/feedback.js`

- Windows users: This uses Unix `cp` command
- May fail on Windows without Git Bash or WSL
- Manual copy needed if build script fails

### 7. HashRouter vs BrowserRouter

Uses `HashRouter` ([index.tsx:8](index.tsx#L8)) instead of `BrowserRouter`

- URLs will have `#` prefix: `http://localhost:3000/#/dashboard`
- Reason: Likely for static hosting compatibility (Firebase Hosting, Netlify)

### 8. Custom Cursor Requires Specific HTML Structure

Interactive elements need one of:

- Semantic tags: `<a>`, `<button>`, `<input>`, `<select>`, `<textarea>`
- `role="button"` attribute
- `data-interactive="true"` attribute
- CSS `cursor: pointer`

---

## Development Workflow

### Daily Development

1. `npm run dev` - Starts both servers
2. Open http://localhost:3000
3. Sign in with email link authentication
4. First-time users start with `status: 'pending'` - manually approve in Firestore

### Adding New Features

1. **Components:** Place in appropriate feature directory ([components/board/](components/board/), etc.)
2. **Pages:** Add to [pages/](pages/) and wire route in [App.tsx](App.tsx)
3. **Types:** Update [types.ts](types.ts) with new interfaces
4. **Context:** If adding global state, add to [DataContext.tsx](contexts/DataContext.tsx) (avoid new contexts)

### Admin CMS Access

- Route: `/admin/*`
- Completely separate layout from main app
- Admin pages in [pages/admin/](pages/admin/)
- Toggle admin mode with `AdminModeToggle.tsx` (only visible to admins)

### Debugging

- **React DevTools:** Inspect component tree and contexts
- **Network tab:** Check `/api/proxy` calls and Firebase requests
- **Console errors:** LiquidEther Three.js warnings are normal
- **Hot reload:** Both Vite (frontend) and ts-node-dev (API) support HMR

### Firebase Emulator (Optional)

[firebase.json](firebase.json) configured for Data Connect emulator:

```json
"emulators": {
  "dataconnect": {
    "dataDir": "dataconnect/.dataconnect/pgliteData"
  }
}
```

Run with: `firebase emulators:start`

---

## Common Tasks

### Update Firestore Rules

1. Edit [firestore.rules](firestore.rules)
2. Deploy: `firebase deploy --only firestore:rules`
3. **Important:** Test rules don't break authenticated user access

### Update Firestore Indexes

1. Edit [firestore.indexes.json](firestore.indexes.json)
2. Deploy: `firebase deploy --only firestore:indexes`
3. Current indexes: `comments.dueDate` (ascending + descending)

### Add New Component to shadcn/ui

```bash
npx shadcn@latest add [component-name]
```

Components auto-configured for "new-york" variant ([components.json](components.json))

### Build for Production

```bash
npm run build
```

Output:

- `dist/` - Main app bundle
- `dist/feedback.js` - Standalone feedback widget (also copied to `public/`)

### Run Tests Before Commit

```bash
npm run test:coverage
```

Ensure coverage thresholds met for changed files

### Fix VS Code Issues

If VS Code becomes unresponsive or corrupted:

```powershell
.\fix_vscode.ps1
```

**Warning:** Closes VS Code forcefully and resets workspace state

---

## VPS Infrastructure (49.13.129.43)

### Services

| Service | URL | Port | Stack |
|---------|-----|------|-------|
| Client Dashboard | client.samixism.com | 3000 (PM2) | Node/Vite |
| Dashboard API | — | 3001 (PM2) | Express |
| Linkwarden | links.samixism.com | 3010→3000 | Docker |
| Paymenter | billing.samixism.com | 8090→80 | Docker |

### Adding a New Subdomain (Engintron)

**Critical rule: never touch nginx config files directly** — Engintron manages them and will overwrite changes, or worse, break other sites.

The correct workflow:

1. **Create the subdomain** in WHM/cPanel under the `clientdash` account
2. **Delete the stub folder** cPanel creates — it will serve a directory listing otherwise:
   ```bash
   rm -rf /home/clientdash/public_html/<subdomain>
   ```
3. **Add an SSL cert** via WHM → SSL/TLS → Manage SSL for `<subdomain>.samixism.com`
4. **Add a proxy block** in `/etc/nginx/conf.d/custom_rules.conf` — this file is loaded by Engintron and survives updates:
   ```nginx
   server {
       listen 443 ssl;
       listen [::]:443 ssl;
       http2 on;
       server_name <subdomain>.samixism.com;
       ssl_certificate /etc/letsencrypt/live/<subdomain>.samixism.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/<subdomain>.samixism.com/privkey.pem;
       location / {
           proxy_pass http://127.0.0.1:<PORT>;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_read_timeout 90;
       }
   }
   ```
5. **Reload nginx** (test first):
   ```bash
   nginx -t && nginx -s reload
   ```
6. **If the app runs in Docker**, also update `/etc/csf/csfpost.sh` (see below)

### Docker + CSF Firewall

CSF wipes Docker iptables rules on every restart. `/etc/csf/csfpost.sh` re-adds them automatically.

**Current state of `/etc/csf/csfpost.sh`:**
```bash
#!/bin/bash
# Paymenter bridge (clientdash_paymenter_nw)
iptables -I FORWARD -i br-a57334a8c326 -j ACCEPT
iptables -I FORWARD -o br-a57334a8c326 -j ACCEPT
iptables -I OUTPUT -d 172.18.0.0/16 -j ACCEPT

# Linkwarden bridge (linkwarden_default)
iptables -I FORWARD -i br-c92adab77623 -j ACCEPT
iptables -I FORWARD -o br-c92adab77623 -j ACCEPT
iptables -I OUTPUT -d 172.21.0.0/16 -j ACCEPT
```

**When adding a new Docker app:**
1. Start the container and get its bridge ID: `docker network ls`
2. Get the subnet: `docker network inspect <network> --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'`
3. Add both FORWARD and OUTPUT rules to `csfpost.sh` for the new bridge
4. Run `csf -r` to restart CSF and test — the `csfpost.sh` script runs automatically

**Warning:** Bridge IDs (`br-XXXX`) change if you do `docker compose down && up`. After a full stack restart, re-check bridge IDs and update `csfpost.sh`.

### Linkwarden (`~/linkwarden/`)

Bookmark manager at https://links.samixism.com. Register your account at https://links.samixism.com/register.

**Key files:**
- `~/linkwarden/docker-compose.yml` — uses `build: .` pointing to local Dockerfile
- `~/linkwarden/Dockerfile` — extends official image, patches `next start --hostname 0.0.0.0`
- `~/linkwarden/.env` — secrets and config

**Why the Dockerfile exists:** Next.js 14 binds to `127.0.0.1` by default inside Docker, which blocks docker-proxy from forwarding external traffic. The Dockerfile patches the start script to bind on `0.0.0.0`. Without this, Linkwarden returns 502.

**To update Linkwarden:**
```bash
cd ~/linkwarden
docker compose build --pull   # pulls new upstream + re-applies patch
docker compose up -d
```

**Do NOT** change the image back to `ghcr.io/linkwarden/linkwarden:latest` directly in docker-compose.yml — it will break the hostname fix.

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
