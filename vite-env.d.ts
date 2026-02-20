/// <reference types="vite/client" />

// ─── Facebook JS SDK Global Types ────────────────────────────────────────────
// The FB object is injected by the SDK script in index.html (not an npm pkg).
// export {} makes this file a module so `declare global` is valid here.
export {};

type FBLoginStatus = 'connected' | 'not_authorized' | 'unknown';

interface FBAuthResponse {
  accessToken: string;
  expiresIn: number;
  signedRequest: string;
  userID: string;
  grantedScopes?: string;
}

interface FBStatusResponse {
  status: FBLoginStatus;
  authResponse: FBAuthResponse | null;
}

interface FBLoginOptions {
  scope?: string;
  return_scopes?: boolean;
  auth_type?: 'rerequest' | 'reauthenticate';
  enable_profile_selector?: boolean;
}

interface FBInitParams {
  appId: string;
  cookie?: boolean;
  xfbml?: boolean;
  version: string;
}

interface Facebook {
  init(params: FBInitParams): void;
  getLoginStatus(callback: (response: FBStatusResponse) => void, force?: boolean): void;
  login(callback: (response: FBStatusResponse) => void, options?: FBLoginOptions): void;
  logout(callback: (response: object) => void): void;
  api(path: string, callback: (response: unknown) => void): void;
  api(path: string, params: object, callback: (response: unknown) => void): void;
  AppEvents: {
    logPageView(): void;
  };
}

declare global {
  interface Window {
    FB: Facebook;
    fbAsyncInit: () => void;
  }
  // Allow FB to be used directly in modules without window prefix
  const FB: Facebook;
}
// ─────────────────────────────────────────────────────────────────────────────

interface ImportMetaEnv {
  readonly VITE_NOVU_APP_ID: string
  readonly VITE_NOVU_SUBSCRIBER_ID: string
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  // Add other VITE_ prefixed env vars as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
