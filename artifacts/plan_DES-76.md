# Enhanced Files Management System - Google Drive Integration (DES-76)

Implement inline file previews for different file types: images, pdfs, videos, office documents, and code snippets with lazy-loading and optimizations.

## Proposed Changes

### Dependencies Layer

- Install `react-pdf`, `react-player`, `react-syntax-highlighter`.
- Install `@types/react-pdf`, `@types/react-syntax-highlighter` as dev dependencies.
- Update `types/drive.ts` file if necessary, or just consume existing file types.

---

### Core / Utility Hooks

#### [NEW] `hooks/useIntersectionObserver.ts`

Custom hook using `IntersectionObserver` to trigger lazy-loading of previews only when a file card scrolls into the viewport. Allows controlling load prioritization.

---

### UI Components -> Preview Renderers

#### [NEW] `components/files/FilePreview.tsx`

Central router component for lazy-loaded previews. Routes based on `file.mimeType` or extension to one of the specific preview components. Provides fallback for unsupported formats.

#### [NEW] `components/files/ImagePreview.tsx` & `ImageLightbox.tsx`

Image preview component showing a thumbnail in the card; on click opens a modal lightbox for full-resolution view.

#### [NEW] `components/files/PDFPreview.tsx` & `PDFViewer.tsx`

Uses `react-pdf` to render the first page of a PDF document as thumbnail; on click opens a modal with a full document paginated viewer.

#### [NEW] `components/files/VideoPreview.tsx` & `VideoPlayer.tsx`

Video component displaying thumbnail; click triggers a modal containing a `react-player` element supporting standard media formats.

#### [NEW] `components/files/OfficeDocumentPreview.tsx` & `OfficeDocumentViewer.tsx`

Preview Office formats via Google Docs viewer inside an `iframe`.

#### [NEW] `components/files/CodePreview.tsx` & `CodeViewer.tsx`

Syntax highlighted code preview using `react-syntax-highlighter`. Code truncated to 15 lines in grid, full view in modal.

---

### Integration

#### [MODIFY] `components/files/FileCard.tsx`

Integrate `FilePreview` within `FileCard`. When visible (using `useIntersectionObserver`), `FilePreview` will be lazy-loaded. Add click handlers to trigger modals appropriately instead of standard downloads/views where applicable (unless preview is unavailable).

## Verification Plan

### Automated Tests

- Run `npx tsc --noEmit` to verify there are no TypeScript errors across all strictly typed modifications.

### Manual Verification

- Validate lazy loading by observing network requests systematically triggering as file cards scroll down.
- Click on image, PDF, code file, text file, office doc, and video file types to verify correct modal rendering and interaction (lightbox mapping, PDF flipping, code copy-to-clipboard, etc.).
