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

## 2025-03-15 - SSRF Protection bypass with IPv6 Brackets and IPv4-mapped IPv6
**Vulnerability:** The SSRF URL validator logic (`api/urlValidator.ts`) checked the `hostname` directly against regexes for private IPs, failing to account for Node `URL` wrapping IPv6 hostnames in brackets (e.g., `[::1]`). Furthermore, it did not block IPv4-mapped IPv6 address ranges (e.g., `[::ffff:127.0.0.1]`), allowing an attacker to bypass localhost SSRF restrictions using these alternate representations.
**Learning:** Node.js URL normalization keeps IPv6 brackets and normalizes IPv4-mapped representations. Hostname validation logic relying on string matching or regexes against IPs must strip brackets before matching, and explicitly block mapping mechanisms like `::ffff:`.
**Prevention:** Always sanitize IPv6 brackets out of parsed hostnames (`hostname.replace(/^\[|\]$/g, '')`) before doing strict string comparisons or regular expression matching for SSRF protection, and ensure the blacklists include catch-alls for `::ffff:.*` IPv4-to-IPv6 transition mechanisms.
