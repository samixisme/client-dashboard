// Facebook JS SDK global type declarations.
// The FB object is injected by the SDK <script> in index.html — not an npm package.

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
}
