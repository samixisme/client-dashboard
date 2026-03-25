## 2024-03-13 - Added ARIA attributes to search filters and sorting
**Learning:** Screen readers need dynamic context for repeated "Clear all" buttons in facet filters, otherwise they all sound identical. Also, custom sort dropdowns must properly signal their expanded/collapsed state using `aria-expanded` to allow keyboard/screen reader users to understand the UI's state.
**Action:** Always use dynamic labels (e.g., ``aria-label={`Clear all ${label} filters`}``) when multiple identical actions exist on a page, and always tie `aria-expanded` to the state variable controlling a custom dropdown's visibility.

## 2024-03-25 - Added ARIA attributes to navigation icons
**Learning:** Icon-only navigation actions (e.g., back/forward arrows, sidebar module switchers) lack contextual text, which makes them inaccessible or confusing to screen readers. Adding `aria-label` provides the necessary context for users navigating via keyboard and screen reader.
**Action:** Always add `aria-label` to icon-only buttons or interactive elements that act like buttons, especially those used for navigation.
