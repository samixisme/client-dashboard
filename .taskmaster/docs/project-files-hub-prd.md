# PRD: Project Files Hub — Unified Project Cloud

## 1. Overview

Transform the existing global Files page into a **project-scoped "Project Cloud"** that aggregates every file, asset, creation, and link associated with the active project into a single, unified hub. Think of it as a project-level Google Drive that also surfaces all in-app content (task attachments, mockup images, moodboard items, brand assets, feedback videos, email templates, AI-generated assets) alongside actual Google Drive files and external links.

**Goal:** When a user opens the Files hub for a project, they see *everything* related to that project — uploaded files from Google Drive, attachments from tasks, images from feedback mockups, moodboard assets, brand logos/fonts, and manually added external links — all in one searchable, filterable, browsable interface.

---

## 2. Problem Statement

Currently:
- The Files page (`/files`) is global and not project-aware. It simply mirrors the root of a Google Drive folder.
- Content created within the app (task attachments, feedback mockup images, feedback videos, moodboard images, brand assets, email templates, AI-generated visuals) lives only within their respective feature pages. There is no single place to see "all files for Project X."
- External links (e.g., Figma boards, Notion docs, Google Docs) relevant to a project have no home.
- Users must navigate to 5+ different pages to find assets related to a single project.

---

## 3. Target Users

- **Admin users** (agency owners/managers) who manage multiple projects and need quick access to all project assets.
- **Client users** who need to see, download, and review deliverables and assets for their project.

---

## 4. User Stories

1. As a user, I want to open the Files hub for my active project and see all Google Drive files stored in that project's folder, so I can manage uploads in one place.
2. As a user, I want to see all in-app content (task attachments, mockup images, feedback videos, moodboard items, brand assets, email template thumbnails, AI-generated assets) aggregated automatically, so I don't have to hunt across feature pages.
3. As a user, I want to add external links (Figma, Notion, Google Docs, any URL) to the project hub, so all project-related resources are centralized.
4. As a user, I want to filter the hub by content source/type (Drive, Tasks, Feedback, Moodboard, Brand, Links, etc.), so I can quickly narrow down what I'm looking for.
5. As a user, I want to search across all aggregated content by name/title, so I can find any asset instantly.
6. As a user, I want to click on an aggregated item and be taken to its source (e.g., clicking a task attachment opens the task, clicking a mockup image opens the feedback mockup detail page), so the hub serves as a navigation gateway.
7. As a user, I want to upload files directly from the hub to the project's Google Drive folder, with drag-and-drop support.
8. As a user, I want to see the project Files hub as a tool card on the ToolsPage, with live stats (total files, total links, recent uploads).

---

## 5. Functional Requirements

### 5.1 Project-Scoped Google Drive Integration

**Current state:** `useDriveFiles` hook fetches from `/api/drive/files` with an optional `?folder=` path that navigates the global Drive root.

**Required changes:**

- **Backend:** Add a `?projectId=` query parameter to `/api/drive/files`. When provided, the backend resolves the project's dedicated Drive folder (e.g., `projects/{projectName}` or `projects/{projectId}`) and lists files from there. If the folder doesn't exist, auto-create it on first access.
- **Backend:** Add a `POST /api/drive/folders` endpoint to create project folders on demand.
- **Frontend:** `useDriveFiles` hook should accept an optional `projectId` parameter. When set, all operations (list, upload, delete) are scoped to that project's Drive folder.
- **Route change:** Add a new route `/projects/:projectId/files` that renders the project-scoped Files hub. Keep the existing `/files` route as a global "all files" view.

### 5.2 In-App Content Aggregation

Create a new hook `useProjectFiles(projectId)` that aggregates content from existing DataContext collections into a unified `ProjectFile[]` array. No new Firestore collections needed — this is a client-side aggregation layer.

**Content sources to aggregate:**

| Source | DataContext key(s) | What to extract | Category label |
|--------|-------------------|-----------------|----------------|
| Task attachments | `data.tasks` (filtered by project's boards) | `task.attachments[]` — each has `{id, name, url, type}` | "Tasks" |
| Feedback mockup images | `data.feedbackMockups` (filtered by projectId) | `mockup.images[]` — each has `{id, name, url}` | "Feedback" |
| Feedback videos | `data.feedbackVideos` (filtered by projectId) | `video.videos[]` — each has `{id, name, url}` | "Feedback" |
| Moodboard items (images) | `data.moodboardItems` (filtered by project's moodboards) | Items where `type === 'image'` — extract `content.imageUrl` | "Moodboard" |
| Moodboard items (links) | `data.moodboardItems` (filtered by project's moodboards) | Items where `type === 'link'` — extract `content.url` | "Moodboard" |
| Brand logos | `data.brands` (matching project's brandId) | `brand.logos[]` — each has `{url, name, tags}` | "Brand" |
| Brand imagery | `data.brands` (matching project's brandId) | `brand.imagery[]` — each has `{name, url}` | "Brand" |
| Brand graphics | `data.brands` (matching project's brandId) | `brand.graphics[]` — each has `{name, url}` | "Brand" |
| Brand fonts | `data.brands` (matching project's brandId) | `brand.fonts[]` — each has `{name, url}` | "Brand" |
| Email template thumbnails | `data.emailTemplates` (filtered by projectId or brandId) | `template.thumbnailUrl` if set | "Email" |
| Roadmap item attachments | `data.roadmapItems` (filtered by projectId) | `item.attachments[]` — each has `{id, name, url, type}` | "Roadmap" |

**Unified ProjectFile interface:**

```typescript
interface ProjectFile {
  id: string;                     // Unique across all sources: `{source}:{originalId}`
  name: string;                   // Display name
  url: string;                    // Direct URL (Firebase Storage URL, Drive webViewLink, or external URL)
  thumbnailUrl?: string;          // Optional thumbnail for images/videos
  mimeType?: string;              // MIME type if known
  size?: string;                  // File size if known
  source: ProjectFileSource;      // 'drive' | 'task' | 'feedback' | 'moodboard' | 'brand' | 'email' | 'roadmap' | 'link'
  sourceLabel: string;            // Human-readable: "Google Drive", "Task Attachment", etc.
  sourceId?: string;              // ID of the parent entity (taskId, mockupId, moodboardId, etc.)
  sourceRoute?: string;           // Route to navigate to the source entity
  createdAt?: string;             // ISO string if available
  modifiedAt?: string;            // ISO string if available
  isExternal?: boolean;           // True for external links
}

type ProjectFileSource = 'drive' | 'task' | 'feedback' | 'moodboard' | 'brand' | 'email' | 'roadmap' | 'link';
```

### 5.3 External Links Management

Add the ability to store project-level external links. This requires a **new Firestore collection:** `projectLinks`.

```typescript
interface ProjectLink {
  id: string;
  projectId: string;
  title: string;
  url: string;
  description?: string;
  favicon?: string;           // Auto-fetched from URL
  category?: string;          // User-defined: "Design", "Docs", "Reference", etc.
  createdBy: string;          // userId
  createdAt: string;          // ISO string
  pinned?: boolean;           // Pin to top of links section
}
```

**Firestore rules:** Follow existing pattern — any authenticated user can read/write.

**Features:**
- Add link form: URL input with auto-fetch of page title and favicon (via existing proxy server capabilities)
- Edit/delete links
- Pin important links to the top
- Optional category tags for organization
- Links integrated into the unified `ProjectFile[]` array with `source: 'link'`

### 5.4 Project Files Hub UI

**Page route:** `/projects/:projectId/files`

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  Header: Project name + "Files" title + Upload + Add Link│
├────────┬─────────────────────────────────────────────────┤
│        │  Search bar + View toggle (list/grid) + Sort    │
│ Source  │─────────────────────────────────────────────────│
│ Filter  │                                                │
│ Sidebar │  File content area                             │
│         │  - Google Drive files (with folder navigation) │
│ ☐ All   │  - In-app aggregated content                   │
│ ☐ Drive │  - External links                              │
│ ☐ Tasks │                                                │
│ ☐ Feed. │                                                │
│ ☐ Mood. │                                                │
│ ☐ Brand │                                                │
│ ☐ Links │                                                │
│         │                                                │
│ Storage │  Footer: file count + storage usage             │
│ Usage   │                                                │
└────────┴─────────────────────────────────────────────────┘
```

**Sidebar:** Replace the current hardcoded `PINNED_FOLDERS` with a dynamic source filter. Each source shows a count badge. "All" is selected by default.

**When "Drive" source is selected:** Show full folder navigation (existing breadcrumb + subfolder navigation), scoped to the project's Drive folder. Upload and delete functionality active.

**When other sources are selected:** Show flat list/grid of aggregated items from that source. Each item links back to its origin page. No upload/delete for aggregated items (they are read-only references).

**When "All" is selected:** Show a combined view with section headers grouping items by source. Drive files appear first, then in-app content grouped by source, then external links at the bottom.

**Reuse existing components:** `FileCard`, `FileUpload`, `StorageUsage`, `FileBreadcrumb` should be extended or composed, not rewritten. The unified `ProjectFile` interface should be compatible with `FileCard` rendering.

### 5.5 ToolsPage Integration

Add a **"Files" tool card** to `ToolsPage.tsx` with live stats:

```typescript
{
  label: "Files",
  description: "All project files, assets, and links in one place.",
  Icon: FilesIcon,
  href: `/projects/${project.id}/files`,
  stats: [
    { label: "Drive Files", value: driveFileCount },
    { label: "Attachments", value: inAppFileCount },
    { label: "Links", value: linkCount },
  ]
}
```

Stats should be computed from the same data sources as the hub, using DataContext data. Drive file count can be fetched via a lightweight API call or cached.

### 5.6 Quick Access from Sidebar

The main app sidebar/navigation should include a "Files" entry that:
- If a project is active (via `ActiveProjectContext`), navigates to `/projects/:projectId/files`
- If no project is active, navigates to `/files` (global view)

---

## 6. Non-Functional Requirements

- **Performance:** The aggregation hook should use `useMemo` to avoid re-computing the unified file list on every render. Only recompute when the underlying DataContext collections change.
- **No mock data:** All data must come from real Firestore collections (via DataContext) and real Google Drive API calls. No hardcoded/placeholder content.
- **Existing patterns:** Follow the established data access pattern — client-facing pages use DataContext or dedicated hooks with `onSnapshot` for real-time data. No raw Firestore SDK calls in page components.
- **Responsive:** The layout should work well on all screen sizes. Sidebar collapses on mobile.
- **Error handling:** Each data source in the aggregation should fail gracefully (if Drive API is unreachable, still show in-app content and vice versa).

---

## 7. API Changes

### 7.1 Backend: `/api/drive/files` enhancement

Add support for `?projectId=` query parameter:

```
GET /api/drive/files?projectId=abc123
```

Backend behavior:
1. Look up the project name from Firestore (or accept a `projectFolder` query param directly)
2. Resolve or create the folder path `projects/{projectName}` in Google Drive
3. List files within that folder (existing `listFiles` logic applies)
4. Return the same `{ files, folders, currentPath }` response shape

### 7.2 Backend: `POST /api/drive/folders`

Create a Drive folder on demand:

```
POST /api/drive/folders
Body: { path: "projects/My Project Name" }
Response: { folderId: "...", path: "projects/My Project Name" }
```

### 7.3 Backend: Link metadata fetching

Add an endpoint to fetch metadata (title, favicon) from a URL for the external links feature:

```
GET /api/link-meta?url=https://figma.com/file/xxx
Response: { title: "My Figma Board", favicon: "https://figma.com/favicon.ico" }
```

This can reuse the existing proxy/cheerio infrastructure in `api/proxy.ts`.

### 7.4 No changes needed for aggregated content

All in-app content (task attachments, mockup images, etc.) is already available via DataContext real-time listeners. The aggregation is purely client-side — no new API endpoints needed for this data.

---

## 8. Data Model Changes

### 8.1 New Firestore Collection: `projectLinks`

```
projectLinks/{linkId}
  - projectId: string (required)
  - title: string (required)
  - url: string (required)
  - description: string (optional)
  - favicon: string (optional)
  - category: string (optional)
  - createdBy: string (required, userId)
  - createdAt: string (required, ISO)
  - updatedAt: string (optional, ISO)
  - pinned: boolean (default: false)
```

### 8.2 DataContext Addition

Add a new real-time listener for `projectLinks` collection in DataContext, filtered by the current user's accessible projects (or unfiltered like most other collections). Store as `data.projectLinks`.

### 8.3 New Types

Add to `types.ts`:

```typescript
export interface ProjectLink {
  id: string;
  projectId: string;
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  category?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  pinned?: boolean;
}
```

Add to a new `types/projectFiles.ts`:

```typescript
export type ProjectFileSource = 'drive' | 'task' | 'feedback' | 'moodboard' | 'brand' | 'email' | 'roadmap' | 'link';

export interface ProjectFile {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  size?: string;
  source: ProjectFileSource;
  sourceLabel: string;
  sourceId?: string;
  sourceRoute?: string;
  createdAt?: string;
  modifiedAt?: string;
  isExternal?: boolean;
}
```

---

## 9. File & Component Structure

### New files to create:

```
types/projectFiles.ts                      — ProjectFile, ProjectFileSource types
hooks/useProjectFiles.ts                   — Aggregation hook
hooks/useProjectLinks.ts                   — CRUD hook for projectLinks collection
pages/ProjectFilesPage.tsx                 — Main project files hub page
components/files/SourceFilterSidebar.tsx    — Replaces FolderSidebar for project hub
components/files/ProjectFileCard.tsx        — Extended card supporting all file sources
components/files/AddLinkDialog.tsx          — Dialog for adding external links
components/files/LinkCard.tsx              — Card specifically for external links
components/files/ProjectFilesHeader.tsx     — Header with title, upload, add link buttons
components/icons/FilesIcon.tsx             — Icon for the Files tool card
```

### Files to modify:

```
pages/ToolsPage.tsx                        — Add Files tool card
contexts/DataContext.tsx                    — Add projectLinks listener
types.ts                                   — Add ProjectLink interface
api/driveRoutes.ts                         — Add projectId support, folder creation
api/server.ts                              — Register any new routes (link-meta)
App.tsx                                    — Add /projects/:projectId/files route
components/files/FolderSidebar.tsx          — May be reused inside Drive-filter view
```

---

## 10. Routing

| Route | Page | Description |
|-------|------|-------------|
| `/projects/:projectId/files` | `ProjectFilesPage` | Project-scoped files hub (new) |
| `/files` | `FilesPage` | Global Drive file browser (existing, unchanged) |

---

## 11. Edge Cases & Considerations

1. **Project with no Drive folder yet:** Auto-create on first access. Show empty state with upload prompt.
2. **Brand not assigned to project:** Skip brand asset aggregation; show nothing for "Brand" source.
3. **Tasks with no attachments:** Don't show empty entries; only aggregate items that have actual files.
4. **Moodboard items with broken image URLs:** Show a placeholder/fallback thumbnail.
5. **External link URL validation:** Validate URL format on input. Don't allow javascript: or data: URIs.
6. **Large projects with many assets:** The aggregation hook should be memoized. Consider pagination for Drive files if exceeding 100+.
7. **Real-time updates:** Since DataContext uses `onSnapshot`, in-app content updates live. Drive files require manual refresh (existing behavior).
8. **Permissions:** Follow existing pattern — any authenticated user can see/manage files. No per-file permissions (matches current Firestore rules).

---

## 12. Success Metrics

- All project-related files accessible from a single page
- Zero mock data — every item comes from real data sources
- File hub loads in under 2 seconds for a typical project (20-50 aggregated items)
- Drive upload/download works seamlessly within the project-scoped context
- External links can be added, edited, and deleted without page reload

---

## 13. Out of Scope (Future Enhancements)

- Google Drive OAuth per-user (currently uses a service account)
- File versioning and history tracking
- Bulk file operations (multi-select delete/download)
- File preview modal (inline document/image viewer)
- Comments on files within the hub
- File sharing with external parties via the hub
- Drag-and-drop file organization between Drive folders

---

## 14. Technical Context (Existing Infrastructure)

### What already exists and should be reused:

- **`hooks/useDriveFiles.ts`** — Full Google Drive CRUD hook (list, upload, delete, navigate, stats). Talks to `/api/drive/*` backend.
- **`api/driveRoutes.ts`** — Express routes for Drive operations (list files, upload via multer, delete, get metadata, resolve folders, quota stats). Uses `utils/googleDrive.ts` service account client.
- **`types/drive.ts`** — `DriveFile`, `DriveFolder`, `DriveStatsResponse`, MIME helpers, `getFileCategory()`, `formatFileSize()`, `formatRelativeTime()`.
- **`components/files/FileCard.tsx`** — List/grid file card with kebab menu (Open in Drive, Download, Delete with confirmation).
- **`components/files/FileUpload.tsx`** — Drag-and-drop upload zone with progress bar, client-side validation (200MB limit, MIME allowlist).
- **`components/files/FolderSidebar.tsx`** — Sidebar with pinned folders + dynamic subfolder list.
- **`components/files/FileBreadcrumb.tsx`** — Breadcrumb trail for folder navigation.
- **`components/files/StorageUsage.tsx`** — Daily upload quota bar with color thresholds.
- **`pages/FilesPage.tsx`** — Global files page composing all above components. Supports list/grid views, sorting, debounced search, page-level drag-to-upload.
- **`contexts/DataContext.tsx`** — Real-time Firestore listeners for all collections (tasks, feedbackMockups, feedbackVideos, moodboards, moodboardItems, brands, emailTemplates, roadmapItems, etc.).
- **`contexts/ActiveProjectContext.tsx`** — Tracks active project via localStorage + React state. Derives `activeProject` and `activeBrand` from DataContext.
- **`api/proxy.ts`** — Cheerio-based HTML parser (can be reused for link metadata fetching).
- **`utils/firebase.ts`** — Firebase Storage initialized via `getStorage()`, with `uploadFile()` helper for asset uploads.

### Data already available in DataContext for aggregation:

- `data.tasks` → `task.attachments[]` (each: `{id, name, url, type}`)
- `data.feedbackMockups` → `mockup.images[]` (each: `{id, name, url}`)
- `data.feedbackVideos` → `video.videos[]` (each: `{id, name, url}`)
- `data.moodboards` + `data.moodboardItems` → image items have `content.imageUrl`, link items have `content.url`
- `data.brands` → `brand.logos[]`, `brand.imagery[]`, `brand.graphics[]`, `brand.fonts[]`
- `data.emailTemplates` → `template.thumbnailUrl`
- `data.roadmapItems` → `item.attachments[]` (each: `{id, name, url, type}`)
- `data.boards` → needed to map tasks to projects (task → board → project)
