## 2024-05-24 - Nested Component Defintions and Full Remounts
**Learning:** React components defined inside other components (e.g., `TaskRow` defined inside `DashboardPage`) are completely unmounted and remounted on every parent render because React sees them as entirely new component types each time. This destroys DOM state and leads to severe performance degradation, especially for list items that map over large arrays.
**Action:** Always extract inner component definitions to the top level (outside of the parent component body). Pass any needed parent scope variables as props, and wrap the extracted list items in `React.memo` for further optimization.

## 2024-05-31 - Admin SDK Batch Reads with db.getAll()
**Learning:** Using `Promise.all(ids.map(id => db.collection(...).doc(id).get()))` in the Firebase Admin SDK creates N separate network roundtrips, which degrades latency for bulk operations. Unlike the `in` operator (which is limited to 30 items), `db.getAll(...refs)` batches multiple document reads into a single network request and supports up to 1000 documents.
**Action:** When fetching multiple known document IDs in the backend/Admin SDK, always use `db.getAll(...refs)` instead of iterating over individual `doc().get()` calls inside a `Promise.all`.
