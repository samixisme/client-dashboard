import { SocialPlatform } from '../types';

const API_BASE = 'http://localhost:3001';

/**
 * Initiate OAuth flow for a social media platform
 */
export const connectPlatform = async (platform: SocialPlatform): Promise<void> => {
  const timestamp = new Date().toISOString();

  try {
    console.log(`🔵 [${timestamp}] Starting OAuth flow for ${platform}`);
    console.log(`🔵 [${timestamp}] API Base URL: ${API_BASE}`);
    console.log(`🔵 [${timestamp}] Request URL: ${API_BASE}/api/social/auth/${platform}`);

    // Get the auth URL from the backend
    const response = await fetch(`${API_BASE}/api/social/auth/${platform}`);

    console.log(`🟢 [${timestamp}] Response received - Status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`🔴 [${timestamp}] Backend error:`, errorData);
      throw new Error(`Failed to get auth URL: ${errorData.error || 'Unknown error'}`);
    }

    const { authUrl, state } = await response.json();
    console.log(`🟢 [${timestamp}] Auth URL received:`, authUrl.substring(0, 100) + '...');
    console.log(`🟢 [${timestamp}] OAuth state:`, state);

    // Store the state in localStorage for verification on callback
    localStorage.setItem(`oauth_state_${platform}`, state);

    // Store the current location to return to after OAuth
    localStorage.setItem('oauth_return_url', window.location.hash.replace('#', ''));

    console.log(`🟢 [${timestamp}] Redirecting to ${platform} OAuth...`);

    // Redirect to the OAuth provider
    window.location.href = authUrl;
  } catch (error) {
    console.error(`🔴 [${timestamp}] Error in connectPlatform:`, error);
    alert(`Failed to connect ${platform}.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck console for details.`);
  }
};

/**
 * Handle OAuth callback after user authorizes
 * Supports both Cloud Function flow (success/error params) and direct OAuth flow (code/state params)
 */
export const handleOAuthCallback = async (): Promise<{ success?: boolean; platform?: string; username?: string; error?: string; message?: string }> => {
  const urlParams = new URLSearchParams(window.location.search);

  // Cloud Function OAuth flow (server-side token exchange)
  const success = urlParams.get('success');
  const platform = urlParams.get('platform');
  const username = urlParams.get('username');
  const error = urlParams.get('error');
  const message = urlParams.get('message');

  // Handle Cloud Function success
  if (success === 'true' && platform) {
    console.log(`✅ OAuth success for ${platform}:`, username);

    // Clean up stored OAuth state
    localStorage.removeItem(`oauth_state_${platform}`);
    localStorage.removeItem('oauth_return_url');

    // Clear URL parameters
    window.history.replaceState({}, '', '/#/social-media');

    return { success: true, platform, username: username || undefined };
  }

  // Handle Cloud Function error
  if (error) {
    console.error('❌ OAuth error:', error, message);

    // Clean URL parameters
    window.history.replaceState({}, '', '/#/social-media');

    return { success: false, error, message: message || undefined };
  }

  // Legacy direct OAuth flow (for other platforms if needed)
  const code = urlParams.get('code');
  const state = urlParams.get('state');

  if (!code || !state) {
    // Not an OAuth callback
    return {};
  }

  // Extract platform from state
  const [statePlatform, stateValue] = state.split(':');

  // Verify state matches what we stored
  const storedState = localStorage.getItem(`oauth_state_${statePlatform}`);
  if (storedState !== state) {
    console.error('State mismatch - possible CSRF attack');
    return { success: false, error: 'security_check_failed', message: 'Security check failed' };
  }

  try {
    // Send the code to backend to complete OAuth flow
    const response = await fetch(`${API_BASE}/api/social/auth/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state }),
    });

    if (!response.ok) {
      throw new Error('Failed to complete OAuth flow');
    }

    const data = await response.json();
    console.log('OAuth success:', data);

    // Clean up stored state
    localStorage.removeItem(`oauth_state_${statePlatform}`);
    localStorage.removeItem('oauth_return_url');

    // Clear URL parameters
    window.history.replaceState({}, '', '/#/social-media');

    return { success: true, platform: statePlatform };
  } catch (error) {
    console.error('Error completing OAuth:', error);
    return { success: false, error: 'auth_failed', message: 'Failed to complete authentication' };
  }
};

/**
 * Redirect back to the page where OAuth was initiated
 */
const redirectToReturnUrl = (): void => {
  const returnUrl = localStorage.getItem('oauth_return_url') || '/social-media';
  localStorage.removeItem('oauth_return_url');

  // Use HashRouter format
  window.location.href = `/#${returnUrl}`;
};

/**
 * Disconnect a platform account
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

    alert('Account disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting account:', error);
    alert('Failed to disconnect account. Please try again.');
  }
};

/**
 * Refresh account data from platform
 */
export const refreshPlatformData = async (accountId: string, platform: SocialPlatform): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/api/social/refresh/${platform}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh data');
    }

    alert('Data refreshed successfully');
  } catch (error) {
    console.error('Error refreshing data:', error);
    alert('Failed to refresh data. Please try again.');
  }
};
