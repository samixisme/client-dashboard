# Linkwarden API — Bearer Token Integration Examples

Practical, copy-paste-ready examples for authenticating with the Linkwarden API. All examples read the token from an environment variable — never hardcode tokens in source code.

---

## Setup

Before running any example, set your token as an environment variable:

```bash
# .env (local development — add this file to .gitignore!)
LINKWARDEN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Verify it is set
echo $LINKWARDEN_TOKEN  # macOS/Linux
echo $env:LINKWARDEN_TOKEN  # Windows PowerShell
```

Generate a token in Linkwarden → **Settings → Access Tokens**.  
See [`LINKWARDEN.md`](./LINKWARDEN.md) for the full token generation guide.

---

## cURL

The simplest way to test authentication directly from your terminal:

```bash
# ✅ Recommended: read from environment variable
curl -s \
  -H "Authorization: Bearer $LINKWARDEN_TOKEN" \
  -H "Content-Type: application/json" \
  https://your-linkwarden-instance.com/api/v1/links

# Expected response: JSON array of your bookmarks
```

Test that an invalid token is rejected:

```bash
curl -v \
  -H "Authorization: Bearer INVALID_TOKEN" \
  https://your-linkwarden-instance.com/api/v1/links
# Expected: HTTP/1.1 401 Unauthorized
```

---

## Node.js (native `fetch` / `node-fetch`)

```js
// linkwarden-example.mjs
// Run: LINKWARDEN_TOKEN=<your_token> node linkwarden-example.mjs

const LINKWARDEN_BASE_URL =
  process.env.LINKWARDEN_BASE_URL ?? "https://your-linkwarden-instance.com";
const token = process.env.LINKWARDEN_TOKEN;

if (!token) {
  console.error("Error: LINKWARDEN_TOKEN environment variable is not set.");
  console.error("Run: export LINKWARDEN_TOKEN=<your_token>");
  process.exit(1);
}

async function fetchLinks() {
  const response = await fetch(`${LINKWARDEN_BASE_URL}/api/v1/links`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 401) {
    throw new Error(
      "Authentication failed: token is missing, expired, or invalid.",
    );
  }
  if (response.status === 403) {
    throw new Error(
      "Forbidden: you do not have permission to access this resource.",
    );
  }
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`Found ${data.response?.length ?? 0} links.`);
  return data;
}

fetchLinks().catch(console.error);
```

### With TypeScript + the `LinkwardenAuth` class

```ts
// linkwarden-example.ts
import { LinkwardenAuth } from "./lib/linkwarden/auth";

const LINKWARDEN_BASE_URL =
  process.env.LINKWARDEN_BASE_URL ?? "https://your-linkwarden-instance.com";
const auth = new LinkwardenAuth(process.env.LINKWARDEN_TOKEN ?? "");

async function fetchLinks() {
  // getHeaders() validates the token and throws LinkwardenMissingTokenError if not set
  const response = await fetch(`${LINKWARDEN_BASE_URL}/api/v1/links`, {
    headers: {
      ...auth.getHeaders(),
      "Content-Type": "application/json",
    },
  });

  // handleResponse() throws descriptive errors for 401/403
  auth.handleResponse(response.status);

  return response.json();
}

fetchLinks()
  .then((data) => console.log("Links:", data))
  .catch(console.error);
```

---

## Node.js with Express (backend proxy/service)

```js
// linkwardenService.js — server-side Linkwarden integration
// Store LINKWARDEN_TOKEN in your server's environment / secrets manager

const LINKWARDEN_BASE_URL =
  process.env.LINKWARDEN_BASE_URL ?? "https://your-linkwarden-instance.com";

/**
 * Builds the Authorization header from the server environment variable.
 * @returns {{ Authorization: string }}
 */
function getLinkwardenHeaders() {
  const token = process.env.LINKWARDEN_TOKEN;
  if (!token) {
    throw new Error(
      "Server misconfiguration: LINKWARDEN_TOKEN is not set. " +
        "Add it to your server environment variables or secrets manager.",
    );
  }
  return { Authorization: `Bearer ${token}` };
}

/**
 * Fetch all bookmarks for the authenticated Linkwarden user.
 */
async function getLinks() {
  const response = await fetch(`${LINKWARDEN_BASE_URL}/api/v1/links`, {
    headers: getLinkwardenHeaders(),
  });

  if (response.status === 401)
    throw new Error("Invalid or expired Linkwarden token.");
  if (response.status === 403)
    throw new Error("Access forbidden. Check token permissions.");
  if (!response.ok) throw new Error(`Linkwarden API error: ${response.status}`);

  return response.json();
}

module.exports = { getLinks };
```

---

## Python

```python
# linkwarden_example.py
# Usage: LINKWARDEN_TOKEN=<your_token> python linkwarden_example.py

import os
import json
import urllib.request
import urllib.error

LINKWARDEN_BASE_URL = os.environ.get("LINKWARDEN_BASE_URL", "https://your-linkwarden-instance.com")
TOKEN = os.environ.get("LINKWARDEN_TOKEN")

if not TOKEN:
    raise EnvironmentError(
        "LINKWARDEN_TOKEN environment variable is not set. "
        "Generate one in Linkwarden → Settings → Access Tokens."
    )


def fetch_links() -> dict:
    """Fetch all bookmarks for the authenticated user."""
    url = f"{LINKWARDEN_BASE_URL}/api/v1/links"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 401:
            raise PermissionError(
                "Authentication failed: token is missing, expired, or invalid."
            ) from e
        if e.code == 403:
            raise PermissionError(
                "Forbidden: token does not have access to this resource."
            ) from e
        raise RuntimeError(f"Linkwarden API error: HTTP {e.code}") from e


if __name__ == "__main__":
    links = fetch_links()
    print(f"Found {len(links.get('response', []))} links.")
```

### Python with `requests` library

```python
import os
import requests

TOKEN = os.environ.get("LINKWARDEN_TOKEN")
BASE_URL = os.environ.get("LINKWARDEN_BASE_URL", "https://your-linkwarden-instance.com")

# Create a session with the token pre-configured
session = requests.Session()
session.headers.update({"Authorization": f"Bearer {TOKEN}"})

response = session.get(f"{BASE_URL}/api/v1/links")
response.raise_for_status()  # Raises HTTPError for 4xx/5xx responses
data = response.json()
print(f"Found {len(data.get('response', []))} links.")
```

---

## JavaScript (Browser)

> **⚠ Security Warning:** Never expose your Linkwarden token in client-side browser code.
> Tokens in browser JavaScript are visible to anyone who inspects the page.
> Use a backend proxy to make Linkwarden API calls from the server and return only the data your frontend needs.

If you are building a **same-origin** or fully-controlled private app:

```js
// Only use this in private/internal tools where the token is acceptable in the browser context
const token = import.meta.env.VITE_LINKWARDEN_TOKEN; // Vite / React
// OR
const token = process.env.NEXT_PUBLIC_LINKWARDEN_TOKEN; // Next.js

if (!token) {
  console.error("LINKWARDEN_TOKEN is not configured.");
}

async function fetchLinks() {
  const response = await fetch(
    "https://your-linkwarden-instance.com/api/v1/links",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
```

**Recommended browser pattern**: proxy through your Express server:

```js
// Frontend — calls YOUR server, not Linkwarden directly
const response = await fetch("/api/linkwarden/links"); // your own API route
```

```js
// Express backend (api/linkwardenRoutes.ts) — safely stores the token server-side
router.get("/links", async (req, res) => {
  const linkwardenRes = await fetch(`${LINKWARDEN_URL}/api/v1/links`, {
    headers: { Authorization: `Bearer ${process.env.LINKWARDEN_TOKEN}` },
  });
  const data = await linkwardenRes.json();
  res.json(data);
});
```

---

## Environment Variable Reference

| Variable              | Description                           | Required |
| --------------------- | ------------------------------------- | -------- |
| `LINKWARDEN_TOKEN`    | Bearer token from Linkwarden Settings | ✅ Yes   |
| `LINKWARDEN_BASE_URL` | Base URL of your Linkwarden instance  | ✅ Yes   |

Add these to your `.env.example` (with placeholder values, never real tokens):

```bash
# .env.example — commit this file, NOT .env
LINKWARDEN_TOKEN=your_linkwarden_bearer_token_here
LINKWARDEN_BASE_URL=https://your-linkwarden-instance.com
```
