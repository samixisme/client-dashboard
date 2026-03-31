## 2024-03-13 - Added ARIA attributes to search filters and sorting
**Learning:** Screen readers need dynamic context for repeated "Clear all" buttons in facet filters, otherwise they all sound identical. Also, custom sort dropdowns must properly signal their expanded/collapsed state using `aria-expanded` to allow keyboard/screen reader users to understand the UI's state.
**Action:** Always use dynamic labels (e.g., ``aria-label={`Clear all ${label} filters`}``) when multiple identical actions exist on a page, and always tie `aria-expanded` to the state variable controlling a custom dropdown's visibility.

## 2024-05-19 - Added ARIA listbox pattern to CustomSelect
**Learning:** Custom select dropdown components created without using native `<select>` elements require full implementation of the W3C ARIA listbox pattern. This includes using `aria-activedescendant` linked to the visually focused option's `id`, handling all keyboard navigation natively (Arrow Keys, Enter, Space, Escape, Tab), and managing visual focus within the DOM so assistive technologies can announce the highlighted items correctly.
**Action:** Always implement full keyboard navigation state (`activeIndex`) and explicit ARIA listbox attributes (`role="listbox"`, `role="option"`, `aria-activedescendant`, `aria-selected`, `aria-controls`) when building custom select/dropdown input alternatives.
