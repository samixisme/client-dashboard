## 2025-02-26 - Prevent XSS from URL parameters via DOM insertion
**Vulnerability:** XSS vulnerability in `SocialMediaPage.tsx` caused by directly interpolating URL parameters (`result.username`, `result.message`) into a template string passed to `.innerHTML` for toast notifications.
**Learning:** URL parameters fetched during OAuth callbacks can contain malicious payloads. If directly assigned to `.innerHTML`, script tags or other malicious HTML can be executed by the browser. Even simple fields like `username` or `message` should be considered untrusted.
**Prevention:** Never use template literals containing dynamic values with `.innerHTML`. Always create empty containers (e.g., `<span class="message-container"></span>`) and then use `.textContent` or `.innerText` to securely inject dynamic content, ensuring it is treated as text, not executable HTML.

## 2025-02-26 - Prevent XSS in search highlight rendering
**Vulnerability:** XSS vulnerability in `ResultCard.tsx` (and potentially other places) caused by utilizing `dangerouslySetInnerHTML` to render search results highlighted with HTML `<mark>` tags. While string sanitization was present, directly injecting HTML strings remains risky.
**Learning:** Utilizing `dangerouslySetInnerHTML` for basic text highlighting like search results is an unnecessary security risk, even when XSS prevention methods are applied to strings beforehand.
**Prevention:** Rather than parsing strings into HTML on the server or in utility functions, utility functions should return safely map-able arrays (e.g., `{ text: string, isMatch: boolean }`). These arrays can then be mapped safely via React (e.g. rendering `<mark>` nodes directly within the component itself rather than string building).
