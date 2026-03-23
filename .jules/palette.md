## 2024-03-13 - Added ARIA attributes to search filters and sorting
**Learning:** Screen readers need dynamic context for repeated "Clear all" buttons in facet filters, otherwise they all sound identical. Also, custom sort dropdowns must properly signal their expanded/collapsed state using `aria-expanded` to allow keyboard/screen reader users to understand the UI's state.
**Action:** Always use dynamic labels (e.g., ``aria-label={`Clear all ${label} filters`}``) when multiple identical actions exist on a page, and always tie `aria-expanded` to the state variable controlling a custom dropdown's visibility.

## 2025-03-24 - Added aria-expanded and aria-haspopup to dropdowns in modals
**Learning:** For dynamic dropdowns triggered by buttons inside modals (like assigning users or tags), adding `aria-expanded` and `aria-haspopup="listbox"` provides crucial context for screen reader users, helping them understand that clicking the button reveals a list of options.
**Action:** Always ensure any button that opens a custom dropdown menu dynamically links its `aria-expanded` state to the boolean controlling the menu's visibility and defines `aria-haspopup`.
