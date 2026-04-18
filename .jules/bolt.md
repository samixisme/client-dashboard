## 2024-05-24 - Nested Component Defintions and Full Remounts
**Learning:** React components defined inside other components (e.g., `TaskRow` defined inside `DashboardPage`) are completely unmounted and remounted on every parent render because React sees them as entirely new component types each time. This destroys DOM state and leads to severe performance degradation, especially for list items that map over large arrays.
**Action:** Always extract inner component definitions to the top level (outside of the parent component body). Pass any needed parent scope variables as props, and wrap the extracted list items in `React.memo` for further optimization.

## 2026-03-13 - Optimizing Firebase Admin SDK document fetches
**Learning:** For fetching multiple Firestore documents by ID/reference in the Admin SDK, using individual `doc().get()` calls inside `Promise.all` creates separate network requests and is less efficient.
**Action:** Always use `db.getAll(...refs)` instead. It is significantly more efficient, fetches up to 1000 documents in a single batched network request, and bypasses the 30-item limit of the 'in' operator.

## 2024-05-25 - Avoid O(N*M) and multiple passes for computing derived statistics
**Learning:** Chaining multiple `.filter().length` or `.filter().reduce()` operations inside React components (or hooks like `useMemo`) forces multiple O(N) array traversals, which becomes slow for large arrays. Furthermore, using `Array.includes()` inside an array loop creates an O(N*M) complexity.
**Action:** Replace multiple `.filter()` passes with a single `.forEach()` or `.reduce()` loop that computes all metrics at once. Replace `Array.includes()` inside loops with O(1) `Set.has()` lookups by creating a `Set` prior to the loop.
