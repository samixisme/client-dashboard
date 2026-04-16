## 2024-05-24 - Nested Component Defintions and Full Remounts
**Learning:** React components defined inside other components (e.g., `TaskRow` defined inside `DashboardPage`) are completely unmounted and remounted on every parent render because React sees them as entirely new component types each time. This destroys DOM state and leads to severe performance degradation, especially for list items that map over large arrays.
**Action:** Always extract inner component definitions to the top level (outside of the parent component body). Pass any needed parent scope variables as props, and wrap the extracted list items in `React.memo` for further optimization.

## 2026-03-13 - Optimizing Firebase Admin SDK document fetches
**Learning:** For fetching multiple Firestore documents by ID/reference in the Admin SDK, using individual `doc().get()` calls inside `Promise.all` creates separate network requests and is less efficient.
**Action:** Always use `db.getAll(...refs)` instead. It is significantly more efficient, fetches up to 1000 documents in a single batched network request, and bypasses the 30-item limit of the 'in' operator.

## 2026-04-16 - Array Lookups in Nested Loops
**Learning:** Using `Array.includes()` inside another array operation (like `.filter()`) creates a hidden O(N*M) nested loop. This codebase relies heavily on contextual data hooks (like `useData()`) that fetch and pass entire large collections (e.g., all tasks, all boards) client-side before filtering them. This pattern exacerbates O(N*M) performance bottlenecks severely compared to backend-paginated systems.
**Action:** Always pre-compute lookup sets (`new Set()`) for collections before filtering over large contextual arrays to maintain O(N) performance, ensuring to safely fall back from undefined contexts with optional chaining.
