## 2024-05-24 - Nested Component Defintions and Full Remounts
**Learning:** React components defined inside other components (e.g., `TaskRow` defined inside `DashboardPage`) are completely unmounted and remounted on every parent render because React sees them as entirely new component types each time. This destroys DOM state and leads to severe performance degradation, especially for list items that map over large arrays.
**Action:** Always extract inner component definitions to the top level (outside of the parent component body). Pass any needed parent scope variables as props, and wrap the extracted list items in `React.memo` for further optimization.

## 2026-03-13 - Optimizing Firebase Admin SDK document fetches
**Learning:** For fetching multiple Firestore documents by ID/reference in the Admin SDK, using individual `doc().get()` calls inside `Promise.all` creates separate network requests and is less efficient.
**Action:** Always use `db.getAll(...refs)` instead. It is significantly more efficient, fetches up to 1000 documents in a single batched network request, and bypasses the 30-item limit of the 'in' operator.

## 2024-06-05 - Avoid O(N*M) in Array Includes inside Loops
**Learning:** Using `Array.prototype.includes()` inside an array iteration method like `.map()`, `.filter()`, or `.forEach()` creates an O(N*M) time complexity. In functions like `useProjectFiles.ts`, this can lead to severe performance bottlenecks if the arrays grow large.
**Action:** Always pre-compute a lookup `Set` using `new Set(array)` before the loop, and use `set.has(item)` instead of `array.includes(item)` to reduce the lookup time complexity to O(1), making the overall operation O(N).

## 2024-06-05 - Avoid Micro-optimizations with useMemo
**Learning:** Wrapping extremely cheap O(1) or O(small N) operations, like checking `.some()` on an object with a few keys, inside `useMemo` often introduces more overhead from the hook itself than it saves. This is a micro-optimization anti-pattern.
**Action:** Reserve `useMemo` for computationally expensive derived state, large object transformations, or to explicitly preserve object referential equality to prevent unnecessary cascading re-renders in deeply nested components. Do NOT blindly wrap cheap operations just because they produce derived values.
