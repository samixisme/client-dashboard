## 2024-05-24 - DocumentDownloadButton Accessibility Improvements
**Learning:** Icon-only states in dynamic buttons often miss proper accessibility labelling, specifically the `aria-label` attribute when the variant is set to 'secondary'.
**Action:** Always add explicit `aria-label`s on buttons when they may conditionally render just an icon (e.g. `variant === 'secondary'`). Use `aria-busy` along with `aria-live` or explicit spinner text to communicate async loading states accurately to screen readers.
