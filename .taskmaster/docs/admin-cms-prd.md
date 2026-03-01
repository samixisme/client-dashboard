# PRD: Fully Functional Admin CMS Backend

## 1. Overview

Make the headless CMS admin backend (`/admin/*`) fully functional with complete CRUD operations for all dashboard entities, proper Firebase Admin SDK integration, real-time data management, role-based access control, and a polished UI/UX that matches the existing design system.

**Current State:** The admin CMS has 16 page shells, a sidebar/header layout, basic user management API routes, and a minimal AdminContext. Most pages lack real CRUD functionality — they either display read-only data from DataContext or are stubs.

**Target State:** A production-ready admin panel where an administrator can manage every entity in the system (users, brands, projects, boards, tasks, feedback, invoices, clients, calendar events, social media, docs, moodboards, email templates, roadmap items, proposals) with full create/read/update/delete operations, bulk actions, search/filter/sort, and analytics.

---

## 2. Design System Requirements

The admin CMS MUST follow the existing design system exactly. No deviations.

### 2.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Components | shadcn/ui (new-york variant) |
| Icons | Lucide React (existing custom icon components in `components/icons/`) |
| Styling | Tailwind CSS v4 with oklch color tokens |
| Animations | Custom CSS keyframes (fadeInUp, scaleIn, slideInRight, shimmer) |
| Toasts | Sonner (dark glass theme) |
| Scrolling | Lenis smooth scroll (already in AdminLayout) |

### 2.2 Color Tokens (from `src/index.css`)

All admin UI must use these CSS custom properties — never hardcode colors:

| Token | Usage |
|-------|-------|
| `bg-background` | Page backgrounds |
| `bg-card` / `text-card-foreground` | Card surfaces |
| `bg-primary` / `text-primary-foreground` | Primary buttons, active sidebar items |
| `bg-secondary` | Secondary buttons, badges |
| `bg-muted` / `text-muted-foreground` | Subtle backgrounds, helper text |
| `bg-accent` | Hover states |
| `bg-destructive` | Delete buttons, error states |
| `border-border` | All borders |
| `bg-input` | Form input backgrounds |
| `ring-ring` | Focus rings |

### 2.3 Glass Morphism Pattern

The existing app uses glass morphism extensively. Admin cards and panels must follow:

```
bg-glass → background with blur
bg-glass-light → lighter variant for hover/nested elements
border-border-color → subtle borders
```

### 2.4 Existing Admin Layout Classes

From `AdminLayout.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`:

- Sidebar: `w-64 bg-glass border-r border-border-color`
- Header: `bg-glass border-b border-border-color h-16`
- Main content: `flex-1 overflow-y-auto p-6` with `max-w-7xl mx-auto`
- Active nav: `bg-primary text-white shadow-lg shadow-primary/20`
- Inactive nav: `text-text-secondary hover:bg-glass-light hover:text-text-primary`
- Section headers: `text-xs font-semibold text-text-secondary uppercase tracking-wider`

### 2.5 Component Patterns

Every admin page MUST use consistent patterns:

**Page Header:**
```
- Title (text-2xl font-bold text-text-primary)
- Description (text-sm text-text-secondary)
- Primary action button (bg-primary rounded-lg)
```

**Data Tables:**
```
- shadcn/ui Table component
- Glass card container
- Sortable column headers
- Row hover: hover:bg-glass-light
- Pagination at bottom
- Bulk selection via checkboxes
```

**Modals/Dialogs:**
```
- shadcn/ui Dialog component
- Glass background with backdrop blur
- Form fields using existing FormField component from components/admin/FormField.tsx
- Cancel + Submit actions
```

**Empty States:**
```
- Centered icon (Lucide, 48px, text-muted-foreground)
- Title + description
- CTA button
```

**Toast Notifications:**
```
- Sonner toast() for success
- toast.error() for failures
- Dark glass styling (already configured in App.tsx)
```

### 2.6 Animation Requirements

- Page entry: `animate-fade-in-up` with staggered delays for cards
- Modal open: `animate-scale-in`
- List items: `animate-fade-in` with `animation-delay` per index
- Transitions: `transition-all duration-200` on hover states

---

## 3. Architecture

### 3.1 AdminContext Enhancement

The current `AdminContext` is minimal (hardcoded `userRole: 'admin'`). It must be enhanced:

```typescript
interface AdminContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  userRole: 'admin' | 'client';
  isAdmin: boolean; // derived from Firestore user doc
  adminStats: AdminDashboardStats | null;
  refreshStats: () => Promise<void>;
}
```

- Read `role` from the Firestore `users` document (field already exists in User type: `role?: 'admin' | 'client'`)
- Gate admin route access: redirect non-admin users to `/` if they navigate to `/admin/*`
- Add a loading state while checking admin role

### 3.2 Express API Route Architecture

Expand `api/adminRoutes.ts` with new route groups. All routes are prefixed with `/admin/api/`.

**Existing routes (keep as-is):**
- `POST /users` — Create user
- `GET /users` — List users (paginated)
- `GET /users/:uid` — Get user
- `PUT /users/:uid` — Update user
- `DELETE /users/:uid` — Delete user
- `POST /users/:uid/disable` — Disable user
- `POST /users/:uid/enable` — Enable user
- `POST /users/:uid/claims` — Set custom claims
- `GET /users/:uid/claims` — Get custom claims
- `POST /bulk/users/import` — Bulk import
- `GET /bulk/users/export` — Bulk export
- `POST /bulk/firestore/backup` — Backup collection
- `POST /bulk/firestore/restore` — Restore collection

**New routes needed:**

| Group | Routes | Operations |
|-------|--------|-----------|
| Brands | `/brands`, `/brands/:id` | CRUD via Firestore Admin SDK |
| Projects | `/projects`, `/projects/:id` | CRUD + member management |
| Boards | `/boards`, `/boards/:id` | CRUD + stage management |
| Tasks | `/tasks`, `/tasks/:id` | CRUD + bulk status update |
| Feedback | `/feedback`, `/feedback/:id` | CRUD + status management |
| Clients | `/clients`, `/clients/:id` | CRUD + Paymenter sync |
| Invoices | `/invoices`, `/invoices/:id` | CRUD + status transitions |
| Estimates | `/estimates`, `/estimates/:id` | CRUD + status transitions |
| Calendar | `/calendar-events`, `/calendar-events/:id` | CRUD |
| Roadmap | `/roadmap-items`, `/roadmap-items/:id` | CRUD + reorder |
| Moodboards | `/moodboards`, `/moodboards/:id` | CRUD |
| Email Templates | `/email-templates`, `/email-templates/:id` | CRUD + duplicate |
| Social Accounts | `/social-accounts`, `/social-accounts/:id` | CRUD |
| Scheduled Posts | `/scheduled-posts`, `/scheduled-posts/:id` | CRUD + publish |
| Proposals | `/proposals`, `/proposals/:id` | CRUD + status update |
| Docs | `/docs`, `/docs/:id` | CRUD |
| Analytics | `/analytics/dashboard` | Aggregated stats |

### 3.3 Admin API Authentication

Add admin-only middleware to all `/admin/api/*` routes:

1. Extract Firebase ID token from `Authorization: Bearer <token>` header
2. Verify token using Firebase Admin SDK (`admin.auth().verifyIdToken()`)
3. Check that the user's Firestore document has `role: 'admin'`
4. Return 403 if not admin

### 3.4 Frontend Data Fetching Pattern

Admin pages should NOT rely on `DataContext` (which is designed for client-side real-time listeners). Instead, admin pages should:

1. Call the Express admin API endpoints directly
2. Use a shared `useAdminFetch` hook for consistent error handling
3. Implement local state for the fetched data
4. Use optimistic updates for better UX
5. Show loading skeletons during fetch

---

## 4. Feature Specifications

### 4.1 Admin Dashboard Page (`/admin`)

**Current:** Likely a stub or minimal page.

**Target:** Analytics overview with key metrics.

**Stats Cards (top row):**
- Total Users (with trend indicator)
- Total Projects (active vs archived)
- Total Tasks (by status breakdown)
- Revenue this month (from invoices)

**Charts Section:**
- Task completion trend (line chart, last 30 days)
- Revenue by month (bar chart)
- User registrations over time (area chart)
- Project status distribution (donut chart)

**Recent Activity Feed:**
- Last 20 activities across all entities
- Each item: icon + description + timestamp + link to entity

**Quick Actions:**
- Create User, Create Project, Create Brand, Create Invoice

### 4.2 Admin Users Page (`/admin/users`)

**Current:** Has `EditUserModal.tsx` component. API routes exist.

**Target:** Full user management with Firebase Auth + Firestore sync.

**Features:**
- Data table with columns: Avatar, Name, Email, Role, Status, Last Login, Actions
- Search by name/email
- Filter by: role (admin/client), status (approved/pending/disabled)
- Sort by: name, email, createdAt, lastSignIn
- Create user modal: email, password, displayName, role, assign to client
- Edit user modal: all fields + role change + status change
- Inline actions: Approve, Disable, Enable, Delete (with confirmation)
- Bulk actions: Approve selected, Disable selected, Delete selected
- User detail expandable row: custom claims, linked client, groups

**Firebase Integration:**
- Create: Firebase Auth `createUser()` + Firestore `users` doc
- Update: Firebase Auth `updateUser()` + Firestore doc
- Delete: Firebase Auth `deleteUser()` + Firestore doc cleanup
- Status: Firestore `users/{uid}.status` field
- Role: Firestore `users/{uid}.role` field

### 4.3 Admin Clients Page (`/admin/clients`)

**Current:** Exists but may be basic.

**Target:** Client management with Paymenter integration.

**Features:**
- Data table: Name, ICE, RC, IF, Address, Linked User, Paymenter ID, Actions
- Create/Edit modal with fields from `Client` type
- Link client to a user account (dropdown of users with role='client')
- Link to Paymenter user (numeric `paymenterUserId`)
- View related invoices/estimates for each client
- Bulk export clients to CSV

**Firestore Collection:** `clients`

### 4.4 Admin Brands Page (`/admin/brands`)

**Current:** Has `AddEditBrandModal.tsx` component.

**Target:** Full brand management.

**Features:**
- Card grid OR table view (toggle)
- Each brand card: logo thumbnail, name, industry, member count, created date
- Create/Edit modal: name, industry, logos (upload multiple), colors (color picker), typography, brand voice, brand positioning
- Logo management: upload, tag (Full Logo/Logomark/Logotype), set variations
- Color management: add/remove colors with hex picker, assign categories (Primary/Secondary)
- Typography management: upload font files, define styles
- Member management: assign/remove users to brand
- Delete with cascade warning (projects, boards, etc.)

**Firestore Collection:** `brands`

### 4.5 Admin Projects Page (`/admin/projects`)

**Current:** Exists.

**Target:** Project lifecycle management.

**Features:**
- Data table: Name, Brand, Status, Members, Created, Actions
- Filter by: brand, status (Active/Archived/Completed)
- Create/Edit modal: name, description, brand (dropdown), status, members (multi-select)
- View linked entities: boards, feedback items, moodboards, docs, roadmap items
- Archive/Unarchive toggle
- Duplicate project (creates copy with all boards and stages)

**Firestore Collection:** `projects`

### 4.6 Admin Boards Page (`/admin/boards`)

**Current:** Exists.

**Target:** Board and stage management.

**Features:**
- Data table: Name, Project, Pinned, Members, Stage Count, Task Count, Actions
- Filter by: project
- Create/Edit modal: name, project (dropdown), background image, member IDs
- Stage management panel (inline): add/remove/reorder stages, set status (Open/Closed)
- Bulk task operations per board: move all tasks, delete completed tasks

**Firestore Collections:** `boards`, `stages`

### 4.7 Admin Tasks Page (`/admin/tasks`)

**Current:** Exists.

**Target:** Cross-board task management.

**Features:**
- Data table: Title, Board, Stage, Priority, Assignees, Due Date, Status, Actions
- Filter by: board, stage, priority (Low/Medium/High), status, assignee
- Sort by: priority, dueDate, createdAt
- Search by title/description
- Inline priority change (dropdown)
- Inline status change (dropdown)
- Bulk actions: change status, change priority, reassign, delete
- Create/Edit modal with all task fields including recurring settings
- Time log view per task
- Link to feedback item source

**Firestore Collection:** `tasks` (nested under boards)

### 4.8 Admin Feedback Page (`/admin/feedback`)

**Current:** Exists.

**Target:** Feedback item management across all projects.

**Features:**
- Data table: Name, Project, Type (mockup/website/video), Status, Comments, Created, Actions
- Filter by: project, type, status (pending/in_review/approved/changes_requested)
- Status change dropdown (inline)
- View comment count and resolution rate
- Create feedback item modal: project, type, name, description, asset upload
- Version management: view version history, add new version
- Bulk approve/reject

**Firestore Collection:** `feedbackItems`

### 4.9 Admin Payments Page (`/admin/payments`)

**Current:** Exists. Has Paymenter integration types.

**Target:** Invoice and estimate management.

**Features:**
- Two tabs: Invoices | Estimates
- Data table: Number, Client, Date, Due Date, Status, Total, Actions
- Filter by: client, status (Draft/Sent/Paid/Overdue), date range
- Status transitions: Draft -> Sent -> Paid (or Overdue)
- Create/Edit redirects to existing CreateInvoicePage/CreateEstimatePage
- PDF download action
- Duplicate invoice/estimate
- Bulk status change
- Revenue summary cards at top

**Firestore Collections:** `invoices`, `estimates`

### 4.10 Admin Calendar Events Page (`/admin/calendar-events`)

**Current:** Has `AddEditCalendarEventModal.tsx`.

**Target:** Event management with source linking.

**Features:**
- Data table: Title, Type, Start, End, Assignees, Source, Actions
- Filter by: type (task/invoice/estimate/roadmap_item/manual/comment), date range
- Create/Edit modal: title, dates, type, source linking, assignees, reminder, Google Meet link
- Inline date editing
- Bulk delete past events

**Firestore Collection:** `calendarEvents`

### 4.11 Admin Roadmap Page (`/admin/roadmap`)

**Current:** Has `AddEditRoadmapItemModal.tsx`.

**Target:** Roadmap item management.

**Features:**
- Data table: Title, Project, Status, Quarter, Start/End Dates, Assignees, Actions
- Filter by: project, status (Planned/In Progress/Completed), quarter
- Create/Edit modal with all RoadmapItem fields
- Drag-to-reorder (order field)
- Timeline visualization (optional enhancement)

**Firestore Collection:** `roadmapItems` (nested under projects)

### 4.12 Admin Moodboards Page (`/admin/moodboards`)

**Current:** Exists.

**Target:** Moodboard management.

**Features:**
- Data table: Name, Project, Item Count, Actions
- Filter by: project
- Create/Edit modal: name, project
- View item count per moodboard
- Delete with confirmation (cascades to moodboard items)
- Quick link to moodboard canvas (opens in main app)

**Firestore Collection:** `moodboards`

### 4.13 Admin Email Templates Page (`/admin/email-templates`)

**Current:** Exists.

**Target:** Email template management.

**Features:**
- Card grid view with thumbnail previews
- Filter by: category (marketing/transactional/notification/newsletter/custom), status (draft/published/archived)
- Create template → redirect to EmailBuilderPage
- Duplicate template
- Change status (draft/published/archived)
- Preview action → redirect to EmailPreviewPage
- Delete with confirmation

**Firestore Collection:** `emailTemplates`

### 4.14 Admin Social Media Page (`/admin/social-media`)

**Current:** Has `AddEditSocialAccountModal.tsx` and `SchedulePostModal.tsx`.

**Target:** Social account and post management.

**Features:**
- Two tabs: Accounts | Scheduled Posts
- Accounts table: Platform, Handle, Display Name, Followers, Connected, Last Synced
- Create/Edit account modal
- Scheduled Posts table: Platform, Content preview, Scheduled For, Status, Actions
- Create scheduled post modal
- Cancel/Reschedule scheduled posts
- Platform filter

**Firestore Collections:** `socialAccounts`, `scheduledPosts`

### 4.15 Admin Docs Page (`/admin/docs`)

**Current:** Exists.

**Target:** Document management.

**Features:**
- Data table: Title, Project, Brand, Mode (page/edgeless), Created By, Pinned, Actions
- Filter by: project, brand, mode
- Create doc → redirect to DocEditorPage
- Pin/Unpin toggle
- Delete with confirmation
- Bulk delete

**Firestore Collection:** `docs`

### 4.16 Admin AI Creator Page (`/admin/aicreator`)

**Current:** Exists.

**Target:** AI-powered content generation hub using Gemini API.

**Features:**
- Brand asset generation (requires GEMINI_API_KEY)
- Social media caption generator
- Email template content suggestions
- Configuration: API key management, model selection, generation parameters

### 4.17 Admin Settings Page (`/admin/settings`)

**Current:** Exists.

**Target:** System configuration.

**Features:**
- General: App name, logo, default timezone
- Firebase: Connection status, collection stats, index status
- Security: API key rotation, CORS settings, rate limit config
- Firestore Rules: Display current rules (read-only), link to Firebase console
- Backup/Restore: Trigger collection backup, restore from backup
- User Settings: Default user status on signup (pending/approved)
- Notifications: Novu configuration status

---

## 5. Sidebar Navigation Update

The admin sidebar currently is missing links for several pages that have routes. Update `AdminSidebar.tsx`:

**Content Section:**
- Dashboard (existing)
- Brands (existing)
- Projects (existing)
- Boards (existing)
- Feedback (existing)
- Moodboards (existing)
- Email Templates (existing)
- Docs (existing)

**Management Section:**
- Tasks (existing)
- Users (existing)
- Clients (add - currently missing from sidebar)
- Payments (existing)
- Calendar Events (add - currently missing from sidebar)
- Roadmap (add - currently missing from sidebar)
- Social Media (add - currently missing from sidebar)
- Proposals (add - new)

**System Section:**
- AI Creator (existing)
- Settings (existing)

---

## 6. Shared Admin Components

### 6.1 Existing (in `components/admin/`)

- `AdminModeToggle.tsx` — keep
- `DeleteConfirmationModal.tsx` — keep, reuse everywhere
- `EditUserModal.tsx` — keep
- `RawJsonEditor.tsx` — keep for debug/power-user editing
- `StructuredEditor.tsx` — keep
- `AddEditBrandModal.tsx` — keep, enhance
- `FormField.tsx` — keep, reuse in all forms
- `EditableItem.tsx` — keep
- `AdminPanel.tsx` — keep
- `AddEditCalendarEventModal.tsx` — keep
- `AddEditRoadmapItemModal.tsx` — keep
- `AddEditSocialAccountModal.tsx` — keep
- `SchedulePostModal.tsx` — keep

### 6.2 New Components Needed

| Component | Purpose |
|-----------|---------|
| `AdminDataTable.tsx` | Reusable data table with sort/filter/search/pagination/bulk-select |
| `AdminStatsCard.tsx` | Metric card with icon, value, trend, label |
| `AdminPageHeader.tsx` | Consistent page title + description + action buttons |
| `AdminEmptyState.tsx` | Centered empty state with icon + CTA |
| `AdminLoadingSkeleton.tsx` | Skeleton loader matching table/card layouts |
| `AdminSearchInput.tsx` | Search input with debounce + clear button |
| `AdminFilterBar.tsx` | Horizontal filter chips with dropdowns |
| `AdminBulkActions.tsx` | Floating bar when items selected (count + actions) |
| `AddEditProjectModal.tsx` | Project CRUD modal |
| `AddEditBoardModal.tsx` | Board CRUD modal |
| `AddEditTaskModal.tsx` | Task CRUD modal |
| `AddEditFeedbackModal.tsx` | Feedback item CRUD modal |
| `AddEditClientModal.tsx` | Client CRUD modal |
| `AddEditDocModal.tsx` | Doc CRUD modal |
| `AddEditProposalModal.tsx` | Proposal CRUD modal |

---

## 7. API Route Implementation Details

### 7.1 Standard CRUD Pattern

Every entity API should follow this pattern:

```typescript
// GET /admin/api/{entity} — List with pagination + filtering
// GET /admin/api/{entity}/:id — Get single
// POST /admin/api/{entity} — Create
// PUT /admin/api/{entity}/:id — Update
// DELETE /admin/api/{entity}/:id — Delete
// POST /admin/api/{entity}/bulk-delete — Bulk delete
```

### 7.2 Response Format

Follow the existing pattern from `adminRoutes.ts`:

```typescript
// Success
{ success: true, data: T, meta?: { total, page, limit, hasMore } }

// Error
{ success: false, error: string }
```

### 7.3 Firestore Admin SDK Usage

Use `api/firebaseAdmin.ts` exports:
- `getAuth()` for Firebase Auth operations
- `getFirestore()` for Firestore Admin operations
- `isAdminInitialized()` guard for graceful degradation

### 7.4 Admin Auth Middleware

Create `api/adminAuthMiddleware.ts`:

```typescript
// 1. Extract Bearer token from Authorization header
// 2. Verify with admin.auth().verifyIdToken(token)
// 3. Fetch user doc from Firestore: users/{uid}
// 4. Check role === 'admin'
// 5. Attach user info to req for downstream handlers
// 6. Return 401 if no token, 403 if not admin
```

---

## 8. Data Validation

Use Zod schemas for all API request body validation. Create `api/schemas/` directory:

| Schema File | Entities |
|-------------|----------|
| `userSchemas.ts` | CreateUser, UpdateUser |
| `brandSchemas.ts` | CreateBrand, UpdateBrand |
| `projectSchemas.ts` | CreateProject, UpdateProject |
| `boardSchemas.ts` | CreateBoard, UpdateBoard, CreateStage |
| `taskSchemas.ts` | CreateTask, UpdateTask, BulkStatusUpdate |
| `feedbackSchemas.ts` | CreateFeedbackItem, UpdateFeedbackItem |
| `clientSchemas.ts` | CreateClient, UpdateClient |
| `invoiceSchemas.ts` | CreateInvoice, UpdateInvoice (may already exist) |
| `calendarSchemas.ts` | CreateCalendarEvent, UpdateCalendarEvent |
| `roadmapSchemas.ts` | CreateRoadmapItem, UpdateRoadmapItem |
| `socialSchemas.ts` | CreateSocialAccount, CreateScheduledPost |
| `emailTemplateSchemas.ts` | CreateEmailTemplate, UpdateEmailTemplate |
| `docSchemas.ts` | CreateDoc, UpdateDoc |
| `proposalSchemas.ts` | CreateProposal, UpdateProposal |

---

## 9. Frontend Hook: `useAdminApi`

Create a shared hook for admin API calls:

```typescript
// hooks/useAdminApi.ts
// - Wraps fetch() with auth token injection
// - Handles loading/error states
// - Provides methods: get, post, put, delete
// - Auto-refreshes token if expired
// - Shows toast on error
```

---

## 10. Security Requirements

1. All admin API routes require Firebase Auth token verification
2. All admin API routes require `role: 'admin'` in Firestore user doc
3. Admin page routes on frontend gated by AdminContext `isAdmin` check
4. Input validation via Zod on all POST/PUT endpoints
5. Rate limiting on admin routes (separate from public routes)
6. Audit log: log all admin write operations (who, what, when) to a `adminAuditLog` Firestore collection

---

## 11. Implementation Priority

### Phase 1: Foundation
1. AdminContext enhancement (role checking, admin gating)
2. Admin auth middleware for API routes
3. Shared components (AdminDataTable, AdminPageHeader, AdminStatsCard, AdminEmptyState, AdminLoadingSkeleton)
4. `useAdminApi` hook
5. Admin sidebar navigation update (add missing links)

### Phase 2: Core Entity Management
6. Users page (enhance existing — connect to admin API)
7. Clients page (full CRUD)
8. Brands page (enhance existing modal — full CRUD)
9. Projects page (full CRUD)
10. Boards page (full CRUD + stage management)

### Phase 3: Content Management
11. Tasks page (full CRUD + bulk operations)
12. Feedback page (full CRUD + status management)
13. Moodboards page (full CRUD)
14. Email Templates page (full CRUD)
15. Docs page (full CRUD)

### Phase 4: Operations & Analytics
16. Payments page (invoices + estimates management)
17. Calendar Events page (full CRUD)
18. Roadmap page (full CRUD)
19. Social Media page (accounts + scheduled posts)
20. Proposals page (full CRUD)

### Phase 5: Dashboard & System
21. Admin Dashboard (stats, charts, activity feed, quick actions)
22. Settings page (system config, backup/restore)
23. AI Creator page (Gemini integration)
24. Audit log viewer

---

## 12. Testing Requirements

- Unit tests for all Zod validation schemas
- Unit tests for admin auth middleware
- Integration tests for each CRUD API route group
- Component tests for shared admin components (AdminDataTable, AdminStatsCard)
- E2E test: admin login -> navigate to users -> create user -> edit -> delete

---

## 13. Non-Goals (Out of Scope)

- Changing the main client-facing app UI/UX
- Migrating away from Firebase
- Adding new entity types not already in types.ts
- Real-time WebSocket updates in admin (polling/refetch is acceptable)
- Mobile-responsive admin layout (desktop-first is acceptable)
- Dark/light mode toggle in admin (use system dark mode from existing CSS)
