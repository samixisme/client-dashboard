# Implementation Plan for DES-130

## Goal

Replace emoji icons with consistent lucide-react components styled in primary green across the `FilterPanel`, and completely remove the redundant `gallery` view mode from the application.

## Proposed Changes

### 1. components/files/FilterPanel.tsx

- [MODIFY] Import `Image, Film, FileText, FileType, Archive, Code2` from `lucide-react`.
- [MODIFY] Update `FILE_TYPE_OPTIONS` to use `React.ReactNode` for icons instead of string emojis.
- [MODIFY] Replace emojis with the lucide icons, adding `className="w-3.5 h-3.5 text-primary"`.
- [MODIFY] Change `w-[500px]` to `w-125` and `w-[800px]` to `w-200` in the dropdown panel wrapper.

### 2. types/drive.ts

- [MODIFY] Remove `'gallery'` from `DriveViewMode` union type.

### 3. components/files/ViewModeSelector.tsx

- [MODIFY] Remove `{ mode: 'gallery', label: 'Gallery', icon: Image }` from the `VIEW_MODES` array.
- [MODIFY] Remove `Image` from `lucide-react` imports.

### 4. pages/FilesPage.tsx

- [MODIFY] Remove `'gallery'` from `VALID_MODES` (`['list', 'grid', 'kanban', 'timeline']`).
- [MODIFY] Remove `import GalleryView from '../components/files/GalleryView';`.
- [MODIFY] Remove `viewMode === 'gallery' ? (...)` rendering branch.

### 5. pages/ProjectFilesPage.tsx

- [MODIFY] Remove `'gallery'` from `VALID_MODES` (`['list', 'grid', 'kanban', 'timeline']`).
- [MODIFY] Remove `import GalleryView from '../components/files/GalleryView';`.
- [MODIFY] Remove `viewMode === 'gallery' ? (...)` rendering branch.

### 6. components/files/GalleryView.tsx

- [DELETE] File deleted completely.

## Verification Plan

### Automated Tests

- Run `npx tsc --noEmit` to verify type safety after removing `gallery` from ViewMode and passing lucide icons in `FilterPanel`.
- Run frontend using `npm run dev` and navigate to `http://localhost:3000/files` to manually verify `Gallery` tab is gone and `FilterPanel` looks correct and scales properly.

### Subtask Execution Ordering

**Wave 1 (Independent):**

- Delete `GalleryView.tsx`.
- Modify `types/drive.ts`.

**Wave 2 (Dependent on Types):**

- Modify `FilterPanel.tsx`.
- Modify `ViewModeSelector.tsx`.
- Modify `FilesPage.tsx`.
- Modify `ProjectFilesPage.tsx`.

## Processor State

Initialized `.taskmaster/processor-state.json` to track execution phase.
