## 2024-04-03 - Add ARIA labels to MainLayout icon buttons
**Learning:** Found that primary layout navigation elements (like back/forward buttons and calendar date controls) lacked `aria-label`s, rendering them as silent or confusing "button" elements to screen reader users because they only contained icons (`&larr;`, `<ArrowLeftIcon/>`).
**Action:** Always ensure icon-only buttons have descriptive `aria-label`s that convey the *action* (e.g., "Go to today", "Previous date") rather than just describing the icon or the dynamic text inside it (like the current date string).
