## 2024-05-24 - Nested Component Defintions and Full Remounts
**Learning:** React components defined inside other components (e.g., `TaskRow` defined inside `DashboardPage`) are completely unmounted and remounted on every parent render because React sees them as entirely new component types each time. This destroys DOM state and leads to severe performance degradation, especially for list items that map over large arrays.
**Action:** Always extract inner component definitions to the top level (outside of the parent component body). Pass any needed parent scope variables as props, and wrap the extracted list items in `React.memo` for further optimization.

## 2026-03-13 - Optimizing Firebase Admin SDK document fetches
**Learning:** For fetching multiple Firestore documents by ID/reference in the Admin SDK, using individual `doc().get()` calls inside `Promise.all` creates separate network requests and is less efficient.
**Action:** Always use `db.getAll(...refs)` instead. It is significantly more efficient, fetches up to 1000 documents in a single batched network request, and bypasses the 30-item limit of the 'in' operator.

## 2024-10-27 - Batching Firestore lookups with db.getAll()
**Learning:** Found an anti-pattern across `api/adminProjectsRoutes.ts` and `api/driveRoutes.ts` where arrays of Firestore document IDs were fetched via `Promise.all(ids.map(id => db.collection(...).doc(id).get()))`. This caused an N+1 query problem, creating unnecessary network latency.
**Action:** Replaced instances of `Promise.all(...get())` with Firestore's `db.getAll(...docRefs)`, which batches multiple ID fetches into a single network request. I must ensure the spread array is never empty by maintaining `length > 0` validation checks before calling `db.getAll()`.
