# Task 111: Core Logic: Implement `useProjectFiles` Aggregation Hook

Develop the core `useProjectFiles` hook that aggregates data from Google Drive, all in-app sources via DataContext, and the new `projectLinks` collection into a single, unified `ProjectFile[]` array.

## Proposed Changes

### Types Extension

We will update the core `types.ts` file to support the new unified file interface.

#### [MODIFY] types.ts

Update `types.ts` to include the unified definitions:

```typescript
export type ProjectFileSource = "drive" | "task" | "mockup" | "video" | "link";

export interface ProjectFile {
  id: string; // Unified unique ID (e.g. "task:123:456")
  projectId: string;
  name: string;
  url: string;
  type: string;
  source: ProjectFileSource;
  sourceRoute?: string;
  createdAt?: Date | string | number | any;
  size?: number;
  thumbnailUrl?: string;
}
```

---

### Core Hook

#### [NEW] src/hooks/useProjectFiles.ts

Create a new hook that aggregates files from the various context structures and Drive hook:

- Google Drive files (via `useDriveFiles`)
- Project Links (from `useData().data.projectLinks`)
- Task Attachments (from `useData().data.tasks`, filtered by `projectId` matching `boards`)
- Feedback Mockup Images (from `useData().data.feedbackMockups`)
- Feedback Video Assets (from `useData().data.feedbackVideos`)

All data will be structured as `ProjectFile` arrays, assigned a source prefix, and aggregated within a single `useMemo` statement depending on `projectId` and the source data points.

## Verification Plan

### Automated Tests

- Run `npx tsc --noEmit` to verify type safety structure.
- Run `npm test` if there are any applicable global testing suites that check hooks.

### Manual Verification

- A unit test stub or test page could be used to verify, however for this specific task, verifying compilation via TypeScript ensures the data transforms appropriately between the standard types.
- Wait for Task 112 (ProjectFilesPage component) to visually test the data output.
