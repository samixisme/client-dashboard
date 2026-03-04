# Batch 3 Plan: Tasks 114, 115, 117

## Tasks

- **114**: External Link Management (AddLinkDialog + LinkCard + CRUD integration)
- **115**: Main Content View & Filtering (ProjectFileCard + grid rendering + `sourceRoute` navigation)
- **117**: 'Files' Tool Card on ToolsPage (static card + live stats)

## Proposed Changes

### Task 114 — External Link Management

#### [NEW] `components/files/AddLinkDialog.tsx`

- Modal dialog with URL + Title + optional description fields.
- On URL `onBlur`/`onPaste`, call `GET /api/link-meta?url=...` to auto-fetch title & favicon.
- On submit, call `useProjectLinks().addLink(...)` with `projectId`, `title`, `url`, `favicon`, `createdBy`, `pinned: false`.
- Support editing mode: pre-fill fields when editing an existing link.

#### [NEW] `components/files/LinkCard.tsx`

- Displays a single `ProjectLink`: favicon, title, URL snippet, and a kebab menu with Edit / Delete.
- Edit opens `AddLinkDialog` in edit mode; Delete calls `useProjectLinks().deleteLink()`.

#### [MODIFY] `pages/ProjectFilesPage.tsx`

- Import and wire `AddLinkDialog` + `LinkCard`. Show an "Add Link" button in the header. Render `LinkCard` components for `project_link` source items.

---

### Task 115 — Main Content View Upgrade

#### [MODIFY] `pages/ProjectFilesPage.tsx`

- Already has `useMemo`-based filtering (search + source). This task upgrades the file grid cards.
- Replace the plain `<a>` cards with a proper `ProjectFileCard` that uses `sourceRoute` for in-app navigation via `useNavigate()` (for hash-router internal routes) vs external `window.open()`.
- Add a view-mode toggle (grid/list) button in the header.

---

### Task 117 — Files Tool Card on ToolsPage

#### [MODIFY] `pages/ToolsPage.tsx`

- Import `FileIcon` from `components/icons/FileIcon`.
- Add a `filesStats` `useMemo` block computing: Drive file count (from `useDriveFiles`), link count (from `data.projectLinks`), and task attachment count (from `data.tasks`).
- Add a new `<ToolCard>` entry for "Files" with `href={/projects/${project.id}/files}` and the computed stats.

## Verification Plan

### Automated Tests

- `npx tsc --noEmit` — full type-safety check after all changes.

### Manual Verification

1. Navigate to a project's ToolsPage → confirm the new "Files" card appears with stats and links to `/projects/:id/files`.
2. On ProjectFilesPage, click "Add Link" → paste a URL → verify title auto-fills → submit → confirm LinkCard appears.
3. Use the LinkCard kebab menu to edit and delete a link.
4. Toggle between source filters and verify counts update. Use the search bar to filter by name.
