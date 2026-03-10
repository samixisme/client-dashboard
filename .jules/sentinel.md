## 2025-02-26 - Prevent XSS from URL parameters via DOM insertion
**Vulnerability:** XSS vulnerability in `SocialMediaPage.tsx` caused by directly interpolating URL parameters (`result.username`, `result.message`) into a template string passed to `.innerHTML` for toast notifications.
**Learning:** URL parameters fetched during OAuth callbacks can contain malicious payloads. If directly assigned to `.innerHTML`, script tags or other malicious HTML can be executed by the browser. Even simple fields like `username` or `message` should be considered untrusted.
**Prevention:** Never use template literals containing dynamic values with `.innerHTML`. Always create empty containers (e.g., `<span class="message-container"></span>`) and then use `.textContent` or `.innerText` to securely inject dynamic content, ensuring it is treated as text, not executable HTML.

## 2025-03-10 - Secure Meta Webhook with HMAC Verification
**Vulnerability:** Meta webhook endpoints in `api/webhooks.ts` accepted unverified payloads, which could allow attackers to forge events (e.g., fake Instagram posts, messages, or comments) by sending POST requests to the public endpoint. The endpoint also fell back to an insecure, hardcoded `WEBHOOK_VERIFY_TOKEN`.
**Learning:** Webhook endpoints must mathematically prove the origin of incoming requests. Meta provides an `X-Hub-Signature-256` header which is an HMAC SHA-256 hash of the *raw, unparsed request body* keyed with the App Secret. In Express, the standard `express.json()` middleware parses the body into an object, discarding the raw buffer needed for HMAC validation.
**Prevention:**
1. Configure `express.json` with a `verify` function to capture and attach the raw buffer to `req.rawBody` before parsing.
2. Require securely configured environment variables (`INSTAGRAM_CLIENT_SECRET`, `WEBHOOK_VERIFY_TOKEN`) and crash/fail securely if missing, rather than using weak fallbacks.
3. Compute the expected HMAC and use `crypto.timingSafeEqual` to compare it against the incoming signature header to prevent timing attacks.
