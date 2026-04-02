## 2024-05-24 - Nested Component Defintions and Full Remounts
**Learning:** React components defined inside other components (e.g., `TaskRow` defined inside `DashboardPage`) are completely unmounted and remounted on every parent render because React sees them as entirely new component types each time. This destroys DOM state and leads to severe performance degradation, especially for list items that map over large arrays.
**Action:** Always extract inner component definitions to the top level (outside of the parent component body). Pass any needed parent scope variables as props, and wrap the extracted list items in `React.memo` for further optimization.

## 2026-03-13 - Optimizing Firebase Admin SDK document fetches
**Learning:** For fetching multiple Firestore documents by ID/reference in the Admin SDK, using individual `doc().get()` calls inside `Promise.all` creates separate network requests and is less efficient.
**Action:** Always use `db.getAll(...refs)` instead. It is significantly more efficient, fetches up to 1000 documents in a single batched network request, and bypasses the 30-item limit of the 'in' operator.
## 2024-05-18 - Nested Component Definitions

**Learning:** Declaring functional components (like `AssetSection`, `LogoCard`, `SortIcon`) inside the render body of a parent component forces React to treat them as brand new component types on every parent render. This bypasses the reconciliation algorithm entirely, causing the DOM nodes to be completely unmounted and remounted, which leads to significant performance degradation, particularly in complex UI like dashboards or settings pages.
**Action:** Always extract inner component definitions to the top level (outside the parent component body). Explicitly pass any required state or functions as props, and wrap them in `React.memo` to further optimize re-renders.
