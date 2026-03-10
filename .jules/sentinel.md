## 2025-02-26 - Prevent XSS from URL parameters via DOM insertion
**Vulnerability:** XSS vulnerability in `SocialMediaPage.tsx` caused by directly interpolating URL parameters (`result.username`, `result.message`) into a template string passed to `.innerHTML` for toast notifications.
**Learning:** URL parameters fetched during OAuth callbacks can contain malicious payloads. If directly assigned to `.innerHTML`, script tags or other malicious HTML can be executed by the browser. Even simple fields like `username` or `message` should be considered untrusted.
**Prevention:** Never use template literals containing dynamic values with `.innerHTML`. Always create empty containers (e.g., `<span class="message-container"></span>`) and then use `.textContent` or `.innerText` to securely inject dynamic content, ensuring it is treated as text, not executable HTML.

## 2025-02-27 - Prevent Stored XSS in Search Result Cards
**Vulnerability:** XSS vulnerability in `ResultCard.tsx` caused by rendering search highlight strings containing malicious `<mark>` payloads with `dangerouslySetInnerHTML`.
**Learning:** `dangerouslySetInnerHTML` allows arbitrary string execution in the DOM if inputs (like Meilisearch highlighted fields) contain unescaped user-generated content.
**Prevention:** Never use `dangerouslySetInnerHTML` for search result highlights. Use the custom `HighlightText` component which parses out the `<mark>` tags and renders the content safely using React nodes.
