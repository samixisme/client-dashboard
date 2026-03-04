# Implementation Plan for Project Files Hub Batch (Tasks 112, 113, 116, 118)

This plan covers the batch processing of four related tasks that lay the foundation for the "Project Files" feature.

## Proposed Changes

### 1. Main Navigation (Task 118)

- **`components/layout/Sidebar.tsx`**: Remove the static `Files` entry from `mainNavItems`. Create a new context-aware `<FilesNavItem />` component (similar to `<ToolsNavItem />`) that reads `activeProjectId` and links to either `/projects/${activeProjectId}/files` or the global `/files` page.

### 2. App Routing (Task 112)

- **`App.tsx`**: Add `<Route path="/projects/:projectId/files" element={<ProjectFilesPage />} />` under the `ProjectLayout` nested routes section.
- **`pages/ProjectFilesPage.tsx`** [NEW]: Create the main view for the hub. This page parses the `projectId`, calls `useProjectFiles(projectId)`, and lays out a 2-column format (sidebar + main grid).

### 3. Source Filtering (Task 113)

- **`components/files/SourceFilterSidebar.tsx`** [NEW]: A sidebar component to be used inside `ProjectFilesPage`. It takes the aggregated `ProjectFile[]` array, computes how many files are in each source (`drive`, `task`, `feedback_mockup`, etc.), and renders selectable filters. It fires an `onFilterChange` event back to the parent page.

### 4. File Upload Integration (Task 116)

- **`pages/ProjectFilesPage.tsx`**: Import the existing `<FileUpload />` component and the `useDriveFiles` hook. Wire up the upload zone. It will use the `uploadFile` method from the hook to allow users to drop files directly into the project's Drive folder.

## Verification Plan

### Automated Tests

- Run `npm run tsc --noEmit` to verify type safety.
- Optional: Add Unit test for `SourceFilterSidebar` counts.

### Manual Verification

1. Open the dev environment and sign in.
2. Select a project to set the `activeProjectId`.
3. Click the "Files" icon in the left-hand main sidebar. Verify it takes you to `/projects/:projectId/files`.
4. Drop a file onto the `FileUpload` zone and ensure it uploads successfully via the Google Drive integration.
5. Check the `SourceFilterSidebar` to ensure counts accurately reflect the mocked data (or real data) present in the system, and that clicking filters narrows down the list.
