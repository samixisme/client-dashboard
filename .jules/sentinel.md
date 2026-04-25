## 2025-02-26 - Prevent XSS from URL parameters via DOM insertion
**Vulnerability:** XSS vulnerability in `SocialMediaPage.tsx` caused by directly interpolating URL parameters (`result.username`, `result.message`) into a template string passed to `.innerHTML` for toast notifications.
**Learning:** URL parameters fetched during OAuth callbacks can contain malicious payloads. If directly assigned to `.innerHTML`, script tags or other malicious HTML can be executed by the browser. Even simple fields like `username` or `message` should be considered untrusted.
**Prevention:** Never use template literals containing dynamic values with `.innerHTML`. Always create empty containers (e.g., `<span class="message-container"></span>`) and then use `.textContent` or `.innerText` to securely inject dynamic content, ensuring it is treated as text, not executable HTML.
## 2025-03-15 - SSRF Protection on Proxy API Endpoints
**Vulnerability:** A Server-Side Request Forgery (SSRF) risk existed in the `POST /api/social/fetch/:platform` endpoint, where user-supplied inputs (`endpoint` containing a full URL) were proxied using `axios` without any internal validation. This could allow an attacker to make the server initiate requests to restricted/private networks or arbitrary hostnames on their behalf.
**Learning:** Even heavily customized proxy configurations with some initial prefix-checking logic (like `endpoint.startsWith('http')`) can be bypassed and need formal URL validation. The repository already had an existing helper `validateUrl` in `api/urlValidator.ts` designed to block access to private IPs and metadata hostnames.
**Prevention:** Always validate full, un-trusted URLs using the established `validateUrl` utility before feeding them into backend HTTP clients (`axios`, `fetch`) when building proxy endpoints.

## 2025-02-17 - Webhook Signature Validation Missing
**Vulnerability:** The `/api/webhooks/instagram` endpoint accepted POST requests without validating the Meta webhook payload signature, allowing arbitrary, potentially malicious injection of data into the backend systems via unverified events.
**Learning:** Adding `crypto.timingSafeEqual` directly on the request signature and the expected hash without first asserting `signatureBuffer.length === expectedBuffer.length` creates an unhandled promise rejection and exploitable DoS condition in Express, because `timingSafeEqual` strictly expects buffers of identical lengths.
**Prevention:** Always assert length equivalence before invoking `timingSafeEqual`. Furthermore, ensure the Express middleware is specifically configured (via `verify` in `express.json`) to persist the raw body buffer, since computing HMAC signatures depends entirely on the original raw bytes of the request.

## 2025-02-14 - Fix Hardcoded/Guessable Fallback Secret in Webhooks
**Vulnerability:** The application used a guessable fallback string (`your-webhook-verify-token-here`) for `WEBHOOK_VERIFY_TOKEN` in Meta Webhooks (`api/webhooks.ts`).
**Learning:** This could allow an attacker to bypass endpoint verification in production if the environment variable was accidentally omitted during deployment.
**Prevention:** Configuration secrets should fail securely if undefined in production. Only permit fallback secrets in strictly controlled testing environments (`NODE_ENV === 'test'`).

## 2025-10-25 - SSRF Bypass via HTTP Redirects
**Vulnerability:** An SSRF vulnerability bypassed existing URL validation because `axios` automatically followed HTTP redirects. While the initial URL was validated against internal IP blocklists, a malicious external server could redirect the request to an internal IP (e.g., `169.254.169.254`), bypassing the check.
**Learning:** Initial URL validation is insufficient if the HTTP client automatically follows redirects to new, unvalidated destinations.
**Prevention:** Always validate redirected URLs using the HTTP client's configuration options (e.g., `beforeRedirect` in `axios` or manually handling redirects in `fetch`) to re-apply the SSRF protection logic before the new request is dispatched.
