## 2025-03-07 - [Hardcoded Webhook Secret]
**Vulnerability:** A fallback hardcoded secret ('my-super-secret-webhook-token-12345') was used for `WEBHOOK_VERIFY_TOKEN` in `functions/src/index.ts`.
**Learning:** Hardcoded fallback values for sensitive environment variables provide a false sense of security and bypass intended security controls, allowing potential attackers who find the source code to spoof webhook events.
**Prevention:** Remove hardcoded fallback secrets. Application startup or function execution should fail securely (e.g., return 500 or exit) if required security tokens are missing in production.
