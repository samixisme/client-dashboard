
## 2024-05-18 - Screen-Reader Context for Dynamic Lists
**Learning:** Icon-only action buttons within dynamically generated lists (e.g., Kanban columns, Roadmap lists) must include contextual information in their `aria-label`. Labels like "Add task" or "Settings" are insufficient when multiple such buttons exist on the page.
**Action:** Always append the name/title of the parent entity to the `aria-label` (e.g., `aria-label="Add task to ${stage.name}"`).
## 2024-05-27 - Icon-only buttons lacking ARIA labels across modals and popovers
**Learning:** Found a consistent pattern where icon-only buttons (`ArrowLeftIcon`, `&times;`, `DeleteIcon`) used in popovers (like `StageActionsPopover`, `RoadmapItemActionsPopover`) and modals (like `AddFeedbackRequestModal`, `AddEditBrandModal`, `RoadmapItemModal`) lacked `aria-label` and `title` attributes. This severely impairs screen reader usability as they cannot determine the button's action without a text label.
**Action:** When creating new icon-only buttons or reviewing similar components, strictly ensure that all icon-only interactive elements contain descriptive `aria-label` and `title` attributes to maintain screen reader accessibility.
