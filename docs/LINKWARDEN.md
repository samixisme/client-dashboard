# Linkwarden API Authentication

This document explains how to obtain and use Bearer token authentication with the Linkwarden API. All developers must read this before making API requests.

## Overview

Linkwarden uses **JWT-based Bearer tokens** for API authentication. Every API request must include a valid token in the `Authorization` header:

```
Authorization: Bearer {access_token}
```

Without a valid token, the API returns `401 Unauthorized`.

---

## Generating an Access Token

Tokens are generated inside your Linkwarden account:

1. Log into your Linkwarden instance in a browser.
2. Navigate to **Settings** (profile icon → Settings).
3. Click the **Access Tokens** tab in the left sidebar.
4. Click **Create New Token**.
5. Give the token a descriptive name (e.g., `client-dashboard-integration`).
6. Copy the token immediately — **it will not be shown again**.

> **⚠ Warning:** If you forget to copy the token, you must delete it and generate a new one.

---

## Token Format

Linkwarden tokens are standard JWTs with the following properties:

| Property      | Value                                |
| ------------- | ------------------------------------ |
| Format        | JWT (JSON Web Token)                 |
| Transport     | HTTP `Authorization` header          |
| Header format | `Authorization: Bearer <token>`      |
| Scope         | Scoped to the generating user's data |

Example header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Using the Token in API Requests

Include the token in the `Authorization` header of every request:

```
GET /api/v1/links HTTP/1.1
Host: your-linkwarden-instance.com
Authorization: Bearer {access_token}
Content-Type: application/json
```

See [`LINKWARDEN_EXAMPLES.md`](./LINKWARDEN_EXAMPLES.md) for language-specific request examples.

---

## Secure Token Storage

### ✅ Do This

- Store tokens in **environment variables**:

  ```bash
  # .env (local development only, never commit this file)
  LINKWARDEN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

- Use a secrets manager in production (e.g., AWS Secrets Manager, Doppler, Vault).
- Rotate tokens periodically or immediately if compromised.
- Use separate tokens for each application/environment.

### ❌ Never Do This

- **Never commit tokens** to version control (Git, GitHub, etc.).
- **Never hardcode** tokens directly in source code.
- **Never log** tokens in application logs.
- **Never share** tokens via Slack, email, or other unsecured channels.

---

## Token Lifecycle

| Event                      | Recommended Action                                   |
| -------------------------- | ---------------------------------------------------- |
| Token created              | Copy immediately and store securely                  |
| Suspected compromise       | Delete the token and generate a new one              |
| Application decommissioned | Delete the associated token                          |
| Routine rotation           | Generate new token, update env var, delete old token |

---

## Server-Side Validation

Linkwarden validates the Bearer token on every protected endpoint. The server:

1. Reads the `Authorization` header from the incoming request.
2. Extracts the JWT after `Bearer `.
3. Verifies the JWT signature and expiry.
4. Returns user-scoped data if valid, or `401 Unauthorized` if not.

---

## Common Token Issues

| Error              | Cause                         | Solution                                        |
| ------------------ | ----------------------------- | ----------------------------------------------- |
| `401 Unauthorized` | Missing or invalid token      | Verify the token is correctly set in the header |
| `401 Unauthorized` | Token expired                 | Generate a new token in Linkwarden Settings     |
| `403 Forbidden`    | Token lacks permission        | Ensure you are accessing your own user data     |
| Token not shown    | Navigated away before copying | Delete and create a new token                   |

---

## Scope and Permissions

Tokens are **user-scoped** — a token grants access only to data owned by the user who generated it. There is no cross-user or admin token scope via the standard access token flow.

**Out of scope (not supported via Bearer tokens):**

- OAuth2 / external identity providers
- Multi-factor authentication
- Token refresh / rotation
- API key alternatives

---

## Security Best Practices Summary

1. ✅ Use environment variables for token storage.
2. ✅ Add token environment variable names to `.env.example` (not the values).
3. ✅ Add `.env` to `.gitignore`.
4. ✅ Use different tokens per environment (dev, staging, production).
5. ✅ Rotate tokens at least quarterly.
6. ❌ Never commit `.env` files containing real tokens.
7. ❌ Never print tokens in application output or error messages.
