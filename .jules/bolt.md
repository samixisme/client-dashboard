## 2024-05-24 - Nested Component Defintions and Full Remounts
**Learning:** React components defined inside other components (e.g., `TaskRow` defined inside `DashboardPage`) are completely unmounted and remounted on every parent render because React sees them as entirely new component types each time. This destroys DOM state and leads to severe performance degradation, especially for list items that map over large arrays.
**Action:** Always extract inner component definitions to the top level (outside of the parent component body). Pass any needed parent scope variables as props, and wrap the extracted list items in `React.memo` for further optimization.

## 2026-03-13 - Optimizing Firebase Admin SDK document fetches
**Learning:** For fetching multiple Firestore documents by ID/reference in the Admin SDK, using individual `doc().get()` calls inside `Promise.all` creates separate network requests and is less efficient.
**Action:** Always use `db.getAll(...refs)` instead. It is significantly more efficient, fetches up to 1000 documents in a single batched network request, and bypasses the 30-item limit of the 'in' operator.

## 2025-05-01 - Avoid Object Recreations in Hooks for Computations Output
**Learning:** Custom hooks that map data out by creating a completely new object reference (like `{}` via `.reduce`) in every render pass will cause all downstream components consuming those objects to re-render, even if the underlying data values haven't actually changed.
**Action:** Ensure custom hooks wrap their non-primitive computed values (objects/arrays) in `useMemo` specifically targeting the objects to avoid causing O(N) downstream component re-renders.