
## 2024-04-15 - Arrow-key Keyboard Navigation in Search
**Learning:** When displaying search results categorized by group (e.g. indexes like projects, tasks, clients), mapping them linearly for keyboard navigation requires tracking a global index across all sub-lists rather than using map-local indexes. Using map-local indexes results in multiple items sharing the same `idx` and getting highlighted simultaneously during navigation.
**Action:** When mapping over grouped data structures to render a linearly navigable list, compute and use a continuous `globalIdx` across all rendered groups to ensure correct, singular selection and highlighting for keyboard navigation.
