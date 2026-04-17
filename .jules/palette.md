## 2024-03-13 - Added ARIA attributes to search filters and sorting
**Learning:** Screen readers need dynamic context for repeated "Clear all" buttons in facet filters, otherwise they all sound identical. Also, custom sort dropdowns must properly signal their expanded/collapsed state using `aria-expanded` to allow keyboard/screen reader users to understand the UI's state.
**Action:** Always use dynamic labels (e.g., ``aria-label={`Clear all ${label} filters`}``) when multiple identical actions exist on a page, and always tie `aria-expanded` to the state variable controlling a custom dropdown's visibility.
## 2024-04-17 - Added Loading State to Async Export Button
**Learning:** For standalone asynchronous operations like generating a PDF via a button, replacing static icons with a loader isn't enough for accessibility. Users relying on assistive tech need context of the ongoing operation, specifically through dynamic `aria-label` updates and `aria-busy="true"` so that the "busy" state is properly communicated.
**Action:** Always include `aria-busy` and an updated `aria-label` for loading buttons, matching the visual indication given by SVG spinners.
