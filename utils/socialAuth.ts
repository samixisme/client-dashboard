import { SocialPlatform } from '../types';

const API_BASE = 'http://localhost:3001';

// ─── Facebook SDK Helpers ─────────────────────────────────────────────────────

/**
 * Returns a Promise that resolves once the Facebook JS SDK is fully loaded.
 * Safe to call at any time — resolves immediately if FB is already available.
 */
const waitForFBSdk = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof window.FB !== 'undefined') {
      resolve();
      return;
    }
    // Poll until the SDK async-loads (usually < 500 ms)
    const interval = setInterval(() => {
      if (typeof window.FB !== 'undefined') {
        clearInterval(interval);
        resolve();
      }
    }, 50);
  });

/**
 * Step 3 of the Facebook Login for Business guide:
 * Check whether the visitor is already logged into Facebook AND has
 * previously authorized this app.
 *
 * Returns the raw FBStatusResponse so callers can branch on status:
 *   'connected'      → user is logged in + has authorized our app
 *   'not_authorized' → user is logged in but hasn't authorized our app yet
 *   'unknown'        → user is not logged into Facebook (or logged out via FB.logout)
 */
export const getFacebookLoginStatus = (): Promise<FBStatusResponse> =>
  new Promise(async (resolve) => {
    await waitForFBSdk();
    // Pass `true` as second arg to force a fresh server-side check (skip cache)
    window.FB.getLoginStatus((response) => {
      resolve(response);
    }, true);
  });

/**
 * Trigger the Facebook Login dialog (client-side popup).
 * Requests the scopes needed for Facebook Login for Business:
 *   - pages_show_list          → list Pages managed by the user
 *   - pages_read_engagement    → read Page likes, comments, shares
 *   - pages_read_user_content  → read posts/content on the Page
 *   - business_management      → access Business Manager assets
 * return_scopes: true          → authResponse.grantedScopes tells us exactly
 *                                which permissions the user actually approved
 *
 * Removed invalid scopes:
 *   ✗ pages_manage_posts  → deprecated, replaced by pages_read_user_content
 *   ✗ read_insights       → deprecated, now requires pages_read_engagement
 */
const fbLogin = (): Promise<FBStatusResponse> =>
  new Promise(async (resolve) => {
    await waitForFBSdk();
    window.FB.login(
      (response) => resolve(response),
      {
        scope: 'pages_show_list,pages_read_engagement,pages_read_user_content,business_management',
        return_scopes: true,
      }
    );
  });

// ─── Step 4: checkLoginState callback ────────────────────────────────────────

/**
 * Step 4 of the Facebook Login for Business guide.
 * This is the callback attached to the Facebook Login Button's onlogin event.
 * It calls FB.getLoginStatus() to get the most recent login state and
 * processes the response via statusChangeCallback.
 *
 * Meta guide equivalent:
 *   function checkLoginState() {
 *     FB.getLoginStatus(function(response) {
 *       statusChangeCallback(response);
 *     });
 *   }
 *
 * @param onStatusChange - Your statusChangeCallback: receives the FBStatusResponse
 *                         and can update UI / store the token as needed.
 */
export const checkLoginState = (
  onStatusChange: (response: FBStatusResponse) => void
): void => {
  if (typeof window.FB === 'undefined') return;

  window.FB.getLoginStatus((response) => {
    onStatusChange(response);
  });
};

/**
 * The default statusChangeCallback used internally.
 * Resolves to a simple result object that connectPlatform can act on.
 * Components can also pass their own callback to checkLoginState for UI updates.
 */
export const statusChangeCallback = (response: FBStatusResponse): {
  isConnected: boolean;
  accessToken: string | null;
  userID: string | null;
  status: FBLoginStatus;
} => {
  if (response.status === 'connected' && response.authResponse) {
    return {
      isConnected: true,
      accessToken: response.authResponse.accessToken,
      userID: response.authResponse.userID,
      status: 'connected',
    };
  }

  return {
    isConnected: false,
    accessToken: null,
    userID: null,
    status: response.status,
  };
};

// ─── Platform Connect ─────────────────────────────────────────────────────────

/**
 * Initiate the connect flow for a social media platform.
 *
 * For Facebook, we follow the Meta "Facebook Login for Business" guide:
 *   1. SDK already loaded in index.html (Step 2 ✅)
 *   2. Check login status with FB.getLoginStatus() (Step 3 ✅)
 *      - 'connected'      → user already authorized → use their token directly
 *      - 'not_authorized' → show FB.login() popup to get authorization
 *      - 'unknown'        → show FB.login() popup (user not in a FB session)
 *
 * For all other platforms, the existing server-side OAuth redirect flow is used.
 */
export const connectPlatform = async (platform: SocialPlatform): Promise<void> => {
  // ── Facebook: use the JS SDK login flow ──────────────────────────────────
  if (platform === 'facebook') {
    try {
      // Step 3: Check current login status first
      const statusResponse = await getFacebookLoginStatus();

      let authResponse: FBAuthResponse | null = statusResponse.authResponse;

      if (statusResponse.status === 'connected' && authResponse) {
        // User is already logged in and has authorized this app.
        // We can proceed directly with the existing access token.
      } else {
        // 'not_authorized' or 'unknown' — prompt the login dialog
        const loginResponse = await fbLogin();

        if (loginResponse.status !== 'connected' || !loginResponse.authResponse) {
          // User cancelled or denied permissions
          throw new Error(
            loginResponse.status === 'not_authorized'
              ? 'Facebook permissions were not granted. Please try again and accept the requested permissions.'
              : 'Facebook login was cancelled or failed. Please try again.'
          );
        }

        authResponse = loginResponse.authResponse;
      }

      // Send the short-lived user access token to our backend.
      // The backend (api/social.ts) will exchange it for a long-lived token (60 days).
      const response = await fetch(`${API_BASE}/api/social/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // We pass the SDK token directly using a special state value so the
          // backend knows this is a client-side FB SDK flow, not a redirect code flow.
          code: authResponse.accessToken,
          state: `facebook:sdk-${authResponse.userID}`,
          userId: authResponse.userID,
          expiresIn: authResponse.expiresIn,
          grantedScopes: authResponse.grantedScopes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend token exchange failed: ${errorData.error || 'Unknown error'}`);
      }

      // Success — the store's Firestore listener will auto-update the account card
      window.history.replaceState({}, '', '/#/social-media/accounts');
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Failed to connect Facebook account');
    }

    return;
  }

  // ── All other platforms: server-side OAuth redirect flow ─────────────────
  try {
    const response = await fetch(`${API_BASE}/api/social/auth/${platform}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to get auth URL: ${errorData.error || 'Unknown error'}`);
    }

    const { authUrl, state } = await response.json();

    // Store state in localStorage for CSRF verification on callback
    localStorage.setItem(`oauth_state_${platform}`, state);

    // Remember where to return after OAuth
    localStorage.setItem('oauth_return_url', window.location.hash.replace('#', ''));

    // Redirect to the OAuth provider
    window.location.href = authUrl;
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error(`Failed to connect ${platform}`);
  }
};

// ─── OAuth Callback Handler ───────────────────────────────────────────────────

/**
 * Handle OAuth callback after user authorizes.
 * Supports both Cloud Function flow (success/error params) and direct OAuth flow (code/state params).
 */
export const handleOAuthCallback = async (): Promise<{
  success?: boolean;
  platform?: string;
  username?: string;
  error?: string;
  message?: string;
}> => {
  const urlParams = new URLSearchParams(window.location.search);

  // Cloud Function OAuth flow (server-side token exchange)
  const success = urlParams.get('success');
  const platform = urlParams.get('platform');
  const username = urlParams.get('username');
  const error = urlParams.get('error');
  const message = urlParams.get('message');

  // Handle Cloud Function success
  if (success === 'true' && platform) {
    localStorage.removeItem(`oauth_state_${platform}`);
    localStorage.removeItem('oauth_return_url');
    window.history.replaceState({}, '', '/#/social-media');
    return { success: true, platform, username: username || undefined };
  }

  // Handle Cloud Function error
  if (error) {
    window.history.replaceState({}, '', '/#/social-media');
    return { success: false, error, message: message || undefined };
  }

  // Direct OAuth code flow (non-Facebook platforms)
  const code = urlParams.get('code');
  const state = urlParams.get('state');

  if (!code || !state) {
    return {};
  }

  const [statePlatform] = state.split(':');

  // Verify state to guard against CSRF
  const storedState = localStorage.getItem(`oauth_state_${statePlatform}`);
  if (storedState !== state) {
    return { success: false, error: 'security_check_failed', message: 'Security check failed' };
  }

  try {
    const response = await fetch(`${API_BASE}/api/social/auth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    });

    if (!response.ok) {
      throw new Error('Failed to complete OAuth flow');
    }

    localStorage.removeItem(`oauth_state_${statePlatform}`);
    localStorage.removeItem('oauth_return_url');
    window.history.replaceState({}, '', '/#/social-media');

    return { success: true, platform: statePlatform };
  } catch (err) {
    return { success: false, error: 'auth_failed', message: 'Failed to complete authentication' };
  }
};

// ─── Disconnect ───────────────────────────────────────────────────────────────

/**
 * Disconnect a platform account.
 * For Facebook, also calls FB.logout() to fully revoke the SDK session.
 */
export const disconnectPlatform = async (accountId: string): Promise<void> => {
  if (!confirm('Are you sure you want to disconnect this account?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/social/disconnect/${accountId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to disconnect account');
    }

    // If the FB SDK is loaded and the user is connected via Facebook,
    // also revoke the SDK session so getLoginStatus returns 'unknown' next time.
    if (typeof window.FB !== 'undefined') {
      window.FB.getLoginStatus((statusResponse) => {
        if (statusResponse.status === 'connected') {
          window.FB.logout(() => {
            // Session revoked — no further action needed
          });
        }
      });
    }
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error('Failed to disconnect account');
  }
};

// ─── Refresh ──────────────────────────────────────────────────────────────────

/**
 * Refresh account data from platform API.
 */
export const refreshPlatformData = async (
  accountId: string,
  platform: SocialPlatform
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/api/social/refresh/${platform}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh data');
    }
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error('Failed to refresh data');
  }
};
