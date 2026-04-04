## 2024-05-24 - Nested Component Defintions and Full Remounts
**Learning:** React components defined inside other components (e.g., `TaskRow` defined inside `DashboardPage`) are completely unmounted and remounted on every parent render because React sees them as entirely new component types each time. This destroys DOM state and leads to severe performance degradation, especially for list items that map over large arrays.
**Action:** Always extract inner component definitions to the top level (outside of the parent component body). Pass any needed parent scope variables as props, and wrap the extracted list items in `React.memo` for further optimization.

## 2026-03-13 - Optimizing Firebase Admin SDK document fetches
**Learning:** For fetching multiple Firestore documents by ID/reference in the Admin SDK, using individual `doc().get()` calls inside `Promise.all` creates separate network requests and is less efficient.
**Action:** Always use `db.getAll(...refs)` instead. It is significantly more efficient, fetches up to 1000 documents in a single batched network request, and bypasses the 30-item limit of the 'in' operator.

## 2026-04-04 - Memoizing non-primitive hook returns
**Learning:** Returning unmemoized non-primitive computed values (like objects or arrays) from custom hooks causes them to be re-created on every render (e.g. when typing in a search input). This defeats `useMemo` and `React.memo` optimizations in downstream components, leading to cascading re-renders across the component tree.
**Action:** Always wrap non-primitive computed values in `useMemo` before returning them from custom hooks if they are meant to be stable across renders.
