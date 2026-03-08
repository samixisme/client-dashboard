
## 2024-05-18 - Screen-Reader Context for Dynamic Lists
**Learning:** Icon-only action buttons within dynamically generated lists (e.g., Kanban columns, Roadmap lists) must include contextual information in their `aria-label`. Labels like "Add task" or "Settings" are insufficient when multiple such buttons exist on the page.
**Action:** Always append the name/title of the parent entity to the `aria-label` (e.g., `aria-label="Add task to ${stage.name}"`).
