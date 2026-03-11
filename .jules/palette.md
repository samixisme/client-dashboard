
## 2024-05-18 - Screen-Reader Context for Dynamic Lists
**Learning:** Icon-only action buttons within dynamically generated lists (e.g., Kanban columns, Roadmap lists) must include contextual information in their `aria-label`. Labels like "Add task" or "Settings" are insufficient when multiple such buttons exist on the page.
**Action:** Always append the name/title of the parent entity to the `aria-label` (e.g., `aria-label="Add task to ${stage.name}"`).
## 2024-03-11 - Global Search Keyboard Navigation
**Learning:** Search result keyboard navigation logic (ArrowUp, ArrowDown, Enter) must flatten grouped UI results in the exact render order to match screen reader and focus navigation expectations. Additionally, when reordering functional scope (e.g., `handleResultClick`), care must be taken to update component dependencies without causing stale closures.
**Action:** When adding keyboard navigation to complex/grouped layouts, always map the underlying data structure to a 1D array representing visual order before applying index-based navigation.
