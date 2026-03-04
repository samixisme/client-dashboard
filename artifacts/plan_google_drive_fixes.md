# Reroute File Uploads to Google Drive

This plan addresses the requirement to completely migrate file uploads from Firebase Storage to Google Drive, ensuring that all uploaded files are organized into a strict `[Brand Name]/[Project Name]` folder hierarchy.

## User Review Required

> [!IMPORTANT]
>
> - Do you want to keep Firebase Storage as a fallback, or completely remove its imports and usage from the frontend? This plan completely removes Firebase Storage references for file uploads.
> - For entities not tied to a specific brand or project (like User Profile avatars or global Roadmap items), this plan proposes placing them in root folders like `Profiles` and `Roadmap`. Please confirm if this is acceptable.

## Proposed Changes

### 1. New Utility Helpers

#### [NEW] `src/utils/driveUpload.ts`

Implement `uploadToDrive(file: File, folderPath: string): Promise<{ url: string, id: string }>` that:

1. Creates a `FormData` object with the file and the specified folder path.
2. Sends a POST request to `/api/drive/upload`.
3. Returns the direct-download format URL (`https://drive.google.com/uc?export=download&id=...`) to replace the Firebase download URL.

#### [NEW] `src/utils/folderPaths.ts`

Implement helpers to resolve dynamic paths based on the context data:

- `getProjectFolderPath(projectId, dataContext)` -> `"Brand Name/Project Name"`
- `getBrandFolderPath(brandId, dataContext)` -> `"Brand Name"`
- Fallbacks for global structures.

### 2. Frontend Component Migrations

The following components currently use Firebase `uploadBytes` and will be migrated to use `uploadToDrive` with the appropriate folder path:

#### [MODIFY] `src/feedback-tool/FeedbackTool.tsx`

- Replace Firebase Storage upload for feedback screenshots. Use `getProjectFolderPath()`.

#### [MODIFY] `src/pages/ProfilePage.tsx`

- Upload avatars to `Profiles/` folder.

#### [MODIFY] `src/pages/FeedbackVideoVersionsSelectionPage.tsx`

- Upload videos to `Brand/Project/Videos/` folder.

#### [MODIFY] `src/pages/FeedbackMockupScreensSelectionPage.tsx`

- Upload screens to `Brand/Project/Mockups/` folder.

#### [MODIFY] `src/components/feedback/VersionUploadModal.tsx`

- Upload feedback files to `Brand/Project/Feedback/` folder.

#### [MODIFY] `src/components/TaskModal.tsx`

- Upload task attachments to `Brand/Project/Tasks/` folder.

#### [MODIFY] `src/components/roadmap/RoadmapItemModal.tsx`

- Upload roadmap attachments to `Roadmap/` folder.

#### [MODIFY] `src/components/projects/AddProjectModal.tsx`

- Upload project thumbnail to `Brand/Project/` folder.

#### [MODIFY] `src/components/admin/AddEditBrandModal.tsx`

- Upload brand logo to `Brand/` folder.

### 3. Backend Verification (`api/driveRoutes.ts` and `utils/googleDrive.ts`)

- The backend `/api/drive/upload` endpoint and `utils/googleDrive.ts`'s `getFolderId` method already support nested folder creation (by splitting the folder string by `/` and finding/creating each depth). No major changes needed here, but we will ensure error handling is robust enough for the full migration.

## Verification Plan

### Automated Tests

- Run `npm run build` to ensure no lingering `firebase/storage` imports break the TypeScript compilation.
- Run `npm test` to verify unit tests continue to pass.

### Manual Verification

- **Create a Brand:** Add a new Brand with a logo. Verify in Google Drive that a folder with the Brand's name is created, containing the logo.
- **Create a Project:** Add a project to the Brand with a thumbnail. Verify a folder with the project's name is nested under the Brand folder, containing the thumbnail.
- **Task Attachments:** Upload an attachment to a task on the project board and verify the file appears in the Google Drive folder.
- **Feedback Tool:** Use the external Feedback widget to capture a screenshot and verify it gets uploaded to Google Drive in the correct project folder instead of Firebase Storage.
