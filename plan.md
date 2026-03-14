1. **Optimize O(n^2) lookups in `DashboardPage.tsx`**:
   - The `recentActivities` array generation currently maps over `activities` and does a `.find()` on the `users` array for every activity to get the user object. If `activities` and `users` are large, this becomes very slow (O(n * m)).
   - Convert the `users` array to a `Map` where keys are user IDs, and values are user objects. This changes the lookup to O(1), making the total operation O(n) instead of O(n*m).
   - This optimization pattern is documented in the codebase memory constraints: "Optimize array .find() lookups inside iteration loops (like .map()) by converting the array to a Map beforehand. In React, wrap this conversion in useMemo with the source array as a dependency to achieve O(1) lookup efficiency within the loop."

2. **Also optimize `teamWorkload` calculations**:
   - Currently, `teamWorkload` calculates `taskCount` by iterating over the `tasks` array for *each* user using `tasks.filter()`.
   - Since both `users` and `tasks` can be large, we'll pre-calculate task counts per user using a single pass over the `tasks` array.
   - We will create a `taskCountByUser` object/Map and then build the `teamWorkload` array, reducing an O(u * t) operation to O(u + t).

3. **Pre Commit Steps**: Ensure tests run.

4. **Submit changes**: Commit with PR description.
