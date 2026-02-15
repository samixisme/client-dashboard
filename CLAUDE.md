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
