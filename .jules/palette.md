## 2024-03-13 - Added ARIA attributes to search filters and sorting
**Learning:** Screen readers need dynamic context for repeated "Clear all" buttons in facet filters, otherwise they all sound identical. Also, custom sort dropdowns must properly signal their expanded/collapsed state using `aria-expanded` to allow keyboard/screen reader users to understand the UI's state.
**Action:** Always use dynamic labels (e.g., ``aria-label={`Clear all ${label} filters`}``) when multiple identical actions exist on a page, and always tie `aria-expanded` to the state variable controlling a custom dropdown's visibility.

## 2024-03-28 - Added aria-pressed to toggle button groups
**Learning:** Custom UI button groups (like view switchers or platform selectors) that function as multi-select toggles or tabs must use `aria-pressed` to communicate their active state to screen readers. Relying only on visual cues (like background color or border) leaves assistive technology users without context.
**Action:** When creating or modifying button groups that act as toggles, always bind the `aria-pressed` attribute to the same boolean condition that controls the active visual state.
