1. **Understand the Goal**: Provide ONE small performance improvement under 50 lines. The issue is that the application has a number of nested React components (components defined inside other components).
2. **Analysis**:
   - `pages/BrandDetailPage.tsx` defines `AssetSection` and `LogoCard` inside `BrandDetailPage`.
   - `pages/FeedbackItemPage.tsx` defines `ToolbarButton` inside `FeedbackItemPage`.
   - `pages/admin/AdminBoardsPage.tsx` defines `SortIcon` inside `AdminBoardsPage`.
   - `pages/admin/AdminMoodboardsPage.tsx` defines `SortIcon` inside `AdminMoodboardsPage`.
   - According to React documentation and our agent guidelines, nested component definitions cause components to unmount and remount completely on every parent render. This is very inefficient.
   - Extracting `ToolbarButton` in `pages/FeedbackItemPage.tsx` and wrapping it in `React.memo` will save significant DOM manipulation since it's rendered multiple times and the parent component re-renders on mouse move (`setNewCommentCoords`, etc.).
   - Wait, `pages/FeedbackItemPage.tsx` has heavy state updates (like `setZoom`, `setNewCommentCoords`). Every time `newCommentCoords` changes (on click), the whole `FeedbackItemPage` re-renders, causing all `ToolbarButton`s to unmount and remount.
3. **Proposed Fix**:
   - Extract `ToolbarButton` from `FeedbackItemPage` to the top level.
   - Wrap it in `React.memo` for additional performance.
   - It takes `< 50 lines` of changes and has a measurable impact on DOM stability during interaction (zooming, clicking).
4. **Execution**:
   - Search for `const ToolbarButton` inside `pages/FeedbackItemPage.tsx`.
   - Move it outside the `FeedbackItemPage` component body.
   - Use `React.memo` around it.
   - Run tests/lint.
   - Create PR with the specified format.
