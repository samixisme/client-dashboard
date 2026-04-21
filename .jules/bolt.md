## 2024-05-24 - Nested Component Defintions and Full Remounts
**Learning:** React components defined inside other components (e.g., `TaskRow` defined inside `DashboardPage`) are completely unmounted and remounted on every parent render because React sees them as entirely new component types each time. This destroys DOM state and leads to severe performance degradation, especially for list items that map over large arrays.
**Action:** Always extract inner component definitions to the top level (outside of the parent component body). Pass any needed parent scope variables as props, and wrap the extracted list items in `React.memo` for further optimization.

## 2026-03-13 - Optimizing Firebase Admin SDK document fetches
**Learning:** For fetching multiple Firestore documents by ID/reference in the Admin SDK, using individual `doc().get()` calls inside `Promise.all` creates separate network requests and is less efficient.
**Action:** Always use `db.getAll(...refs)` instead. It is significantly more efficient, fetches up to 1000 documents in a single batched network request, and bypasses the 30-item limit of the 'in' operator.
## 2025-04-21 - Optimizing Firestore Document Reads with db.getAll
**Learning:** Firestore Admin SDK provides a highly efficient `db.getAll(...refs)` function that accepts multiple DocumentReferences and retrieves them in a single batched network request. This is vastly superior and bypasses the 30-item limit of the `.where('field', 'in', [...])` operator. Using `Promise.all(ids.map(id => db.collection('coll').doc(id).get()))` introduces unnecessary overhead and network latency.
**Action:** When fetching an arbitrary number of documents strictly by their ID, always map the IDs to `DocumentReference` objects and pass them collectively to `await db.getAll(...refs)`.
