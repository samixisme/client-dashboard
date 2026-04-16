## 2024-03-13 - Added ARIA attributes to search filters and sorting
**Learning:** Screen readers need dynamic context for repeated "Clear all" buttons in facet filters, otherwise they all sound identical. Also, custom sort dropdowns must properly signal their expanded/collapsed state using `aria-expanded` to allow keyboard/screen reader users to understand the UI's state.
**Action:** Always use dynamic labels (e.g., ``aria-label={`Clear all ${label} filters`}``) when multiple identical actions exist on a page, and always tie `aria-expanded` to the state variable controlling a custom dropdown's visibility.
## 2024-03-24 - Grouping and ARIA attributes for custom toggle button lists
**Learning:** When creating a row or column of custom icon buttons that behave like a toggle view switcher, using a simple flex container is semantically opaque. Furthermore, custom buttons acting as toggles lack standard checked/active announcements.
**Action:** Always wrap grouped toggle buttons in an element with `role="group"` and a descriptive `aria-label`. Apply `aria-pressed={isActive}` on the individual buttons to accurately inform screen readers of the active option.
