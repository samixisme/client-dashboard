
## 2024-05-15 - Dynamic ARIA Labels in Custom Dropdowns
**Learning:** Custom UI components like the `VersionDropdown` need explicit state management via `aria-expanded` tied to their visibility variable, along with `aria-haspopup="menu"`, `role="menu"`, and `role="menuitem"` for proper screen reader communication.
**Action:** When creating or reviewing custom dropdowns or collapsible sidebars in this app, ensure their state is conveyed by tying `aria-expanded` to the visibility state variable, alongside `aria-haspopup` or `aria-controls` where appropriate.
