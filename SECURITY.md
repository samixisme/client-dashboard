# Security Best Practices

This document outlines security practices and implementations for managing secrets and sensitive configuration in this repository.

---

## Quick Reference

| Feature | Status | Location |
|---------|--------|----------|
| Environment Variables | ✅ Implemented | `.env.example` |
| Pre-commit Secret Scanning | ✅ Implemented | `scripts/scan-secrets.js` |
| Firebase App Check | ✅ Implemented | `utils/firebase.ts` |
| Firestore Security Rules | ✅ Implemented | `firestore.rules` |
| API Authentication | ✅ Optional | `api/authMiddleware.ts` |

---

## 1. Environment Variables

### Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your values (get Firebase config from Firebase Console → Project Settings)

3. **Never commit `.env`** - it's already in `.gitignore`

### Required Variables

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | Firebase Console → Project Settings |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console → Project Settings |
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | reCAPTCHA v3 site key | Firebase Console → App Check |

See `.env.example` for the complete list.

---

## 2. Pre-commit Secret Scanning

Automated scanning prevents accidental secret commits.

### How It Works

When you run `git commit`, Husky automatically executes `scripts/scan-secrets.js` which scans staged files for:

- Google API keys (`AIza...`)
- AWS credentials (`AKIA...`)
- Private keys (`-----BEGIN PRIVATE KEY-----`)
- OpenAI API keys (`sk-...`)
- GitHub tokens (`ghp_...`, `gho_...`)
- Slack tokens (`xox...`)
- Stripe live keys (`sk_live_...`)
- Firebase service account files
- Generic API key assignments

### If a Secret is Detected

```
🚨 POTENTIAL SECRETS DETECTED IN STAGED FILES

🔴 CRITICAL:
  src/config.ts:42 - Private Key (-----B...Y-----)

To fix:
  1. Remove the secrets from the files
  2. Use environment variables instead (see .env.example)
  3. If false positive, add pattern to SKIP_PATTERNS in scripts/scan-secrets.js
```

### False Positives

Edit `scripts/scan-secrets.js` and add your file pattern to `SKIP_PATTERNS`:

```javascript
const SKIP_PATTERNS = [
  // ... existing patterns
  /your-file-pattern\.js$/,
];
```

---

## 3. Firebase App Check

App Check protects your Firebase resources from abuse.

### Development Setup

For localhost development, a debug token is configured in `utils/firebase.ts`:

```
d87f033a-8f4d-4340-8e8b-f96ebcd3ff7c
```

**You must register this token in Firebase Console:**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **App Check** → **Apps**
4. Click **Manage debug tokens**
5. Add the token above

### Production Setup

1. Create a reCAPTCHA v3 site key at [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Register the site in Firebase Console → App Check
3. Set `VITE_FIREBASE_APP_CHECK_SITE_KEY` in your production environment

### Error Handling

If App Check fails, you'll see helpful console messages:

```
[Firebase] App Check debug token may not be registered.
To fix: Go to Firebase Console → App Check → Apps → Manage debug tokens
Add token: d87f033a-8f4d-4340-8e8b-f96ebcd3ff7c
```

---

## 4. Firestore Security Rules

### Current Rules

The `firestore.rules` file implements role-based access control:

| Collection | Read | Create | Update/Delete |
|------------|------|--------|---------------|
| `users` | Own doc or admin | Own doc only | Own doc or admin |
| `projects` | Approved users | Approved users | Owner or admin |
| `boards` | Approved users | Approved users | Approved users |
| `tasks` | Approved users | Approved users | Approved users |
| `comments` | Approved users | Approved users | Author or admin |
| `feedback` | Approved users | Approved users | Approved users |
| `brands` | Approved users | Approved users | Approved users |
| `moodboards` | Approved users | Approved users | Approved users |

### User Status

Users have a `status` field that controls access:

- `pending` - New users awaiting approval (cannot access data)
- `approved` - Active users (full access based on rules)

### User Roles

Users can have a `role` field:

- `admin` - Full access to all data and user management
- (default) - Standard approved user access

### Deploying Rules

```bash
firebase deploy --only firestore:rules
```

### Testing Rules

Use the Firebase Emulator or Rules Playground in Firebase Console to test before deploying.

---

## 5. API Security (Express Proxy)

The Express API server (`api/server.ts`) includes:

### Helmet

Security headers are automatically added via Helmet middleware.

### CORS

Configure allowed origins via `ALLOWED_ORIGINS` environment variable:

```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://staging.yourdomain.com
```

### Rate Limiting

Default: 100 requests per 15 minutes per IP. Configure via:

```bash
RATE_LIMIT_MAX=50
```

### API Key Authentication (Optional)

Set `API_KEY` environment variable to enable:

```bash
API_KEY=your-secret-api-key
```

Requests must then include:
- Header: `X-API-Key: your-secret-api-key`
- OR query param: `?apiKey=your-secret-api-key`

### SSRF Protection

The proxy (`api/urlValidator.ts`) blocks requests to:
- Private IP ranges (10.x, 172.16-31.x, 192.168.x)
- Localhost
- Cloud metadata endpoints (169.254.169.254)

---

## 6. Key Rotation

If a key is exposed:

1. **Immediately revoke** the old key in the respective service console
2. Generate a new key
3. Update the key in your environment/secrets manager
4. Deploy the updated configuration
5. Verify the application works with the new key
6. Audit logs for unauthorized access

---

## 7. Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** create a public GitHub issue
2. Email the maintainers directly with details
3. Include steps to reproduce if possible
4. Allow time for a fix before public disclosure

---

## Checklist for Production

- [ ] All secrets in environment variables (not in code)
- [ ] `.env` is in `.gitignore`
- [ ] App Check debug token registered in Firebase Console
- [ ] Firestore rules deployed (`firebase deploy --only firestore:rules`)
- [ ] `API_KEY` set for proxy authentication
- [ ] `ALLOWED_ORIGINS` restricted to production domains
- [ ] Rate limiting configured appropriately
- [ ] Pre-commit hooks installed (`npx husky install`)
