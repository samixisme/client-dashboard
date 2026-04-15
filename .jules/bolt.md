## 2024-05-24 - Nested Component Defintions and Full Remounts
**Learning:** React components defined inside other components (e.g., `TaskRow` defined inside `DashboardPage`) are completely unmounted and remounted on every parent render because React sees them as entirely new component types each time. This destroys DOM state and leads to severe performance degradation, especially for list items that map over large arrays.
**Action:** Always extract inner component definitions to the top level (outside of the parent component body). Pass any needed parent scope variables as props, and wrap the extracted list items in `React.memo` for further optimization.

## 2026-03-13 - Optimizing Firebase Admin SDK document fetches
**Learning:** For fetching multiple Firestore documents by ID/reference in the Admin SDK, using individual `doc().get()` calls inside `Promise.all` creates separate network requests and is less efficient.
**Action:** Always use `db.getAll(...refs)` instead. It is significantly more efficient, fetches up to 1000 documents in a single batched network request, and bypasses the 30-item limit of the 'in' operator.

## 2024-05-25 - O(N*M) Array Includes in Filters
**Learning:** Using `Array.includes()` inside a `filter()` function leads to O(N*M) time complexity, which can be a significant bottleneck for large arrays. In this specific case, filtering tasks by checking if their boardId is included in an array of project board IDs took O(N*M) time.
**Action:** Always convert the inner array to a `Set` before the filter loop. Using `Set.has()` reduces the inner lookup to O(1) on average, improving the overall complexity to O(N+M).
