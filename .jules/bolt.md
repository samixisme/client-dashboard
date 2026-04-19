## 2024-05-24 - Nested Component Defintions and Full Remounts
**Learning:** React components defined inside other components (e.g., `TaskRow` defined inside `DashboardPage`) are completely unmounted and remounted on every parent render because React sees them as entirely new component types each time. This destroys DOM state and leads to severe performance degradation, especially for list items that map over large arrays.
**Action:** Always extract inner component definitions to the top level (outside of the parent component body). Pass any needed parent scope variables as props, and wrap the extracted list items in `React.memo` for further optimization.

## 2026-03-13 - Optimizing Firebase Admin SDK document fetches
**Learning:** For fetching multiple Firestore documents by ID/reference in the Admin SDK, using individual `doc().get()` calls inside `Promise.all` creates separate network requests and is less efficient.
**Action:** Always use `db.getAll(...refs)` instead. It is significantly more efficient, fetches up to 1000 documents in a single batched network request, and bypasses the 30-item limit of the 'in' operator.

## 2024-05-24 - O(N*M) Array Scans in List Items
**Learning:** When rendering a list of components (like `ProjectCard`) where each item calculates derived state by filtering over the entire global dataset (e.g., finding all tasks or boards for that project), it leads to `O(N*M)` complexity during parent renders, severely degrading performance as the dataset grows.
**Action:** Pre-calculate all derived statistics for the list items in a single pass (`O(N)`) using a `useMemo` hook in the parent component. Store the results in a `Map` and pass the pre-calculated object down as a prop to the child components.
