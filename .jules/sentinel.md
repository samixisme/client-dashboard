## 2025-02-26 - Prevent XSS from URL parameters via DOM insertion
**Vulnerability:** XSS vulnerability in `SocialMediaPage.tsx` caused by directly interpolating URL parameters (`result.username`, `result.message`) into a template string passed to `.innerHTML` for toast notifications.
**Learning:** URL parameters fetched during OAuth callbacks can contain malicious payloads. If directly assigned to `.innerHTML`, script tags or other malicious HTML can be executed by the browser. Even simple fields like `username` or `message` should be considered untrusted.
**Prevention:** Never use template literals containing dynamic values with `.innerHTML`. Always create empty containers (e.g., `<span class="message-container"></span>`) and then use `.textContent` or `.innerText` to securely inject dynamic content, ensuring it is treated as text, not executable HTML.

## 2025-02-26 - Prevent SSRF in API Proxy Endpoints
**Vulnerability:** Server-Side Request Forgery (SSRF) vulnerability in `api/social.ts` caused by directly passing user-supplied `endpoint` parameters to internal HTTP clients (`axios`) without validation.
**Learning:** Proxy endpoints designed to forward API requests can be abused to access internal network resources (like `localhost` or cloud metadata services) if the target URL is fully constructed from unvalidated user input.
**Prevention:** Always validate constructed URLs before passing them to HTTP clients in proxy routes. Use a robust URL validator (like `api/urlValidator.ts`) that specifically checks against private IP ranges and blocked hostnames.
