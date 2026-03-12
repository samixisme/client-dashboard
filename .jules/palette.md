
## 2024-05-18 - Screen-Reader Context for Dynamic Lists
**Learning:** Icon-only action buttons within dynamically generated lists (e.g., Kanban columns, Roadmap lists) must include contextual information in their `aria-label`. Labels like "Add task" or "Settings" are insufficient when multiple such buttons exist on the page.
**Action:** Always append the name/title of the parent entity to the `aria-label` (e.g., `aria-label="Add task to ${stage.name}"`).
## 2024-03-12 - [Accessibility] Added ARIA labels to Projects Page
**Learning:** Found that key navigation and action buttons (like View toggles, Filter toggles, and Add actions) in the Projects Page lacked `aria-label`s, making them unreadable to screen readers. Also, dropdown toggles like "Filter" lacked the `aria-expanded` state.
**Action:** Always add descriptive `aria-label`s to icon-only buttons. When adding interactive toggles for dropdowns, use the `aria-expanded={boolean}` attribute to signal the UI state to screen readers.
