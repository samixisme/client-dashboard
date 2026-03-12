## 2025-02-26 - Prevent XSS from URL parameters via DOM insertion
**Vulnerability:** XSS vulnerability in `SocialMediaPage.tsx` caused by directly interpolating URL parameters (`result.username`, `result.message`) into a template string passed to `.innerHTML` for toast notifications.
**Learning:** URL parameters fetched during OAuth callbacks can contain malicious payloads. If directly assigned to `.innerHTML`, script tags or other malicious HTML can be executed by the browser. Even simple fields like `username` or `message` should be considered untrusted.
**Prevention:** Never use template literals containing dynamic values with `.innerHTML`. Always create empty containers (e.g., `<span class="message-container"></span>`) and then use `.textContent` or `.innerText` to securely inject dynamic content, ensuring it is treated as text, not executable HTML.

## 2025-02-27 - Prevent XSS via dangerouslySetInnerHTML in search results
**Vulnerability:** XSS vulnerability in `ResultCard.tsx` where search results (`title` and `snippet`) were being rendered using `dangerouslySetInnerHTML`.
**Learning:** While the input strings were processed with an `escapeHtml` function before setting `innerHTML`, relying on `dangerouslySetInnerHTML` is an anti-pattern and introduces unnecessary risk if the escaping logic is ever bypassed or flawed.
**Prevention:** Instead of generating raw HTML strings and injecting them via `dangerouslySetInnerHTML`, parse the input into an array of safe text segments (e.g., `{ text, isMatch }`) and map these segments directly to safe React elements (like `<mark>` and `React.Fragment`). React automatically escapes string literals rendered this way, providing inherent XSS protection.
