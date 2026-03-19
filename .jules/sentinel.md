## 2025-02-26 - Prevent XSS from URL parameters via DOM insertion
**Vulnerability:** XSS vulnerability in `SocialMediaPage.tsx` caused by directly interpolating URL parameters (`result.username`, `result.message`) into a template string passed to `.innerHTML` for toast notifications.
**Learning:** URL parameters fetched during OAuth callbacks can contain malicious payloads. If directly assigned to `.innerHTML`, script tags or other malicious HTML can be executed by the browser. Even simple fields like `username` or `message` should be considered untrusted.
**Prevention:** Never use template literals containing dynamic values with `.innerHTML`. Always create empty containers (e.g., `<span class="message-container"></span>`) and then use `.textContent` or `.innerText` to securely inject dynamic content, ensuring it is treated as text, not executable HTML.

## 2025-03-15 - SSRF Protection on Proxy API Endpoints
**Vulnerability:** A Server-Side Request Forgery (SSRF) risk existed in the `POST /api/social/fetch/:platform` endpoint, where user-supplied inputs (`endpoint` containing a full URL) were proxied using `axios` without any internal validation. This could allow an attacker to make the server initiate requests to restricted/private networks or arbitrary hostnames on their behalf.
**Learning:** Even heavily customized proxy configurations with some initial prefix-checking logic (like `endpoint.startsWith('http')`) can be bypassed and need formal URL validation. The repository already had an existing helper `validateUrl` in `api/urlValidator.ts` designed to block access to private IPs and metadata hostnames.
**Prevention:** Always validate full, un-trusted URLs using the established `validateUrl` utility before feeding them into backend HTTP clients (`axios`, `fetch`) when building proxy endpoints.

## 2025-03-15 - [CRITICAL] Webhook payload signature verification in Firebase Functions
**Vulnerability:** The Facebook deauthorization (`facebookDeauthorizeCallback`) and data deletion (`facebookDataDeletionCallback`) webhooks in `functions/src/index.ts` did not verify the HMAC SHA-256 signature of the `signed_request` payload. This allowed anyone to forge a payload and delete/deauthorize arbitrary user data without the secret key.
**Learning:** Facebook signed requests must be explicitly validated against the App Secret using `crypto.createHmac('sha256', secret)`. Simply base64 decoding the payload is insecure because the signature is completely ignored.
**Prevention:** Always split the `signed_request` by `.` and cryptographically verify the first part (signature) against the second part (payload) using the App Secret before trusting the data inside it.
