## 2024-03-13 - Added ARIA attributes to search filters and sorting
**Learning:** Screen readers need dynamic context for repeated "Clear all" buttons in facet filters, otherwise they all sound identical. Also, custom sort dropdowns must properly signal their expanded/collapsed state using `aria-expanded` to allow keyboard/screen reader users to understand the UI's state.
**Action:** Always use dynamic labels (e.g., ``aria-label={`Clear all ${label} filters`}``) when multiple identical actions exist on a page, and always tie `aria-expanded` to the state variable controlling a custom dropdown's visibility.

## 2024-04-15 - Applied ARIA roles to TabSwitcher
**Learning:** Even generic, standalone "tab-like" components (`TabSwitcher.tsx`) that don't render their own tabpanels still require `role="tablist"`, `role="tab"`, and `aria-selected` to properly communicate their function and state to screen reader users, distinguishing them from simple button groups.
**Action:** Always verify components that function conceptually as tabs implement at least the basic ARIA tab roles (`tablist` and `tab`), even if they are just visual toggles controlling state externally.
