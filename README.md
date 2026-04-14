# Client Dashboard

A full-stack TypeScript client dashboard for managing projects, feedback, brands, and team collaboration. Built for agency-style workflows with a modern, dark-mode UI.

**Live URL:** [client.samixism.com](https://client.samixism.com)

---

## Features

- **Project Management** — Kanban board (kanban, list, and table views), task tracking, recurring tasks, roadmap
- **Feedback Tool** — Annotate websites, mockups, and videos with pinned comments; proxied injection into external sites
- **Moodboards** — Canvas-based drag-and-drop moodboard builder (Fabric.js)
- **Brands** — Brand asset management and AI-powered brand asset creator
- **Clients** — Client profiles, proposals, estimates, and invoices
- **Payments** — Billing page with Paymenter integration
- **Calendar** — Event tracking and calendar sync
- **Social Media** — Post management and account overview
- **Email Builder** — Drag-and-drop email template builder
- **File Library** — Google Drive–backed file management
- **Search** — Full-text search powered by Meilisearch
- **Notifications** — In-app notifications via Novu
- **AI Features** — Gemini-powered AI tools in the creator and assistant pages
- **Admin CMS** — Separate admin interface for managing all data (users, projects, brands, payments, etc.)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Routing | React Router v6 (HashRouter) |
| State | React Context + Zustand |
| Backend | Express 5 (Node.js proxy + API server) |
| Database | Firebase Firestore (real-time) |
| Storage | Firebase Storage + Google Drive |
| Auth | Firebase Authentication (email link / passwordless) |
| Search | Meilisearch |
| Notifications | Novu |
| AI | Google Gemini (`@google/genai`) |
| Animations | GSAP, Framer Motion, Lenis |
| Canvas | Fabric.js (moodboards), Three.js (WebGL background) |
| Testing | Jest + Testing Library (unit), Playwright (E2E) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project

### Install

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

**Required — Firebase (frontend):**

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=
```

**Recommended — Firebase (frontend):**

```env
VITE_FIREBASE_APP_CHECK_SITE_KEY=
```

**API server security (optional for local development; required in production):**

```env
API_KEY=your-secret-key           # Required in production; enables X-API-Key auth on the proxy
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
RATE_LIMIT_MAX=100                # Requests per 15 min per IP
```

**Optional — integrations:**

```env
GEMINI_API_KEY=         # AI features
VITE_NOVU_APP_ID=       # In-app notifications
MEILISEARCH_HOST=       # Full-text search
MEILISEARCH_API_KEY=
```

### Firebase Setup

1. Configure your Firebase project in the [Firebase Console](https://console.firebase.google.com/)
2. Deploy Firestore rules: `firebase deploy --only firestore:rules`
3. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
4. (Optional) Run the local emulator: `firebase emulators:start`

### Run in Development

```bash
npm run dev
```

This starts two servers concurrently — **both must be running**:

| Server | URL | Purpose |
|--------|-----|---------|
| Vite frontend | http://localhost:3000 | React app |
| Express API | http://localhost:3001 | Proxy + backend routes |

Vite automatically proxies `/api` requests to the Express server.

---

## Build

```bash
npm run build
```

Produces two bundles:

- `dist/` — Main application
- `dist/feedback.js` (also copied to `public/`) — Standalone feedback widget injected into external websites via the proxy

---

## Testing

```bash
npm test                  # Run Jest unit tests once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
npm run test:e2e          # Playwright end-to-end tests
npm run test:integration  # Integration tests (requires Firebase emulator)
```

---

## Project Structure

```
├── api/                  # Express API server (port 3001)
│   ├── server.ts         # Entry point — Helmet, CORS, rate limiting
│   ├── proxy.ts          # Feedback tool proxy (fetches + injects widget)
│   ├── authMiddleware.ts # Optional API key authentication
│   ├── urlValidator.ts   # SSRF protection for outbound requests
│   ├── admin*Routes.ts   # Admin CMS REST endpoints
│   └── schemas/          # Zod request validation schemas
├── components/           # Feature-based React components
│   ├── board/            # Kanban board (kanban / list / table views)
│   ├── feedback/         # Feedback annotation system
│   ├── moodboard/        # Fabric.js canvas moodboards
│   ├── admin/            # Admin CMS components
│   └── layout/           # MainLayout (client) and AdminLayout (CMS)
├── contexts/             # React Contexts (strict nesting order — see below)
├── hooks/                # Custom hooks (useProposals, useDriveFiles, etc.)
├── pages/                # 50+ route-level page components
├── src/feedback-tool/    # Standalone feedback widget (built as feedback.js)
├── types/                # Shared TypeScript interfaces
├── utils/                # firebase.ts and utility helpers
├── __tests__/            # Jest unit and integration tests
├── e2e/                  # Playwright E2E test specs
├── firestore.rules       # Firestore security rules
├── firestore.indexes.json
└── vite.config.ts        # Dual-bundle build config
```

### Context Nesting Order

Contexts **must** be nested in this exact order in `App.tsx` or the app will break:

```
NotificationHistoryProvider
  → UserProvider
    → AdminProvider
      → DataProvider
        → ActiveProjectProvider
          → TimerProvider
            → CalendarProvider
              → SearchProvider
```

### Authentication Flow

1. **Unauthenticated** → redirect to `/login`
2. **Pending approval** → Firestore user has `status: 'pending'` → `/pending-approval`
3. **Approved** → `status: 'approved'` → full app access

First-time sign-ups start as `pending` and must be manually approved in Firestore or via the Admin CMS.

---

## Routing

Uses `HashRouter` — URLs contain a `#` prefix (e.g. `http://localhost:3000/#/dashboard`).

Two distinct layouts:

- `/admin/*` → **AdminLayout** (CMS for managing all data)
- All other routes → **MainLayout** (client-facing dashboard)

---

## Feedback Tool Proxy

The feedback tool can annotate any external website by proxying it through the Express server:

```
GET /api/proxy?url=https://example.com&projectId=123
```

The server fetches the page, rewrites relative URLs, removes CSP headers, and injects the `feedback.js` widget before returning the modified HTML to an iframe.

SSRF protection (`api/urlValidator.ts`) validates the initial requested URL and is intended to block private IPs, localhost, and cloud metadata endpoints.

**Current limitation:** if the upstream server responds with an HTTP redirect, protection depends on the proxy implementation also disabling redirects or revalidating each redirect target. Until that is enforced in the proxy, redirect-based bypasses may still be possible.

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full VPS deployment guide.

The production environment runs on a VPS behind Nginx/Engintron, with both servers managed by PM2.

```bash
# Production build
npm run build

# Start via PM2 (see ecosystem.config.js)
pm2 start ecosystem.config.js
```
