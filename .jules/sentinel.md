## 2024-05-24 - Fix IPv4-mapped IPv6 SSRF bypass
**Vulnerability:** The SSRF protection in `api/urlValidator.ts` blocked standard loopback IPs like `127.0.0.1` but failed to block IPv4-mapped IPv6 loopbacks like `[::ffff:127.0.0.1]` or `[::ffff:7f00:1]` and bracketed private IPv6 ranges.
**Learning:** `new URL(url).hostname` retains the brackets for IPv6 addresses (e.g., `[::1]`). The existing regexes like `/^::1$/` failed to match bracketed IP addresses, making the SSRF protection bypassable using `validator.isURL` which permits these formats.
**Prevention:** Always account for bracketed notation `\[?` and `\]?` when validating IPv6 addresses via regex, and explicitly block the IPv4-mapped IPv6 subnet `::ffff:/96` to prevent bypasses targeting internal IPv4 services.
