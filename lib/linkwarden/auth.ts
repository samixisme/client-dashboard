/**
 * Linkwarden API Bearer Token Authentication
 *
 * Implements RFC 6750 Bearer Token authentication for the Linkwarden REST API.
 * Provides a reusable auth handler that validates tokens before requests and
 * converts server-side authentication errors into descriptive exceptions.
 *
 * @see https://tools.ietf.org/html/rfc6750
 */

// ---------------------------------------------------------------------------
// Custom Error Classes
// ---------------------------------------------------------------------------

/** Base class for all Linkwarden authentication errors. */
export class LinkwardenAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LinkwardenAuthError"
    // Ensure correct prototype chain for instanceof checks in transpiled code.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Thrown when no Bearer token has been set on the client. */
export class LinkwardenMissingTokenError extends LinkwardenAuthError {
  constructor() {
    super(
      "Linkwarden API token is missing. " +
      "Generate one in Linkwarden → Settings → Access Tokens, " +
      "then pass it to the LinkwardenAuth constructor or call setToken()."
    )
    this.name = "LinkwardenMissingTokenError"
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Thrown when the stored token is present but malformed (empty string, etc.). */
export class LinkwardenInvalidTokenError extends LinkwardenAuthError {
  constructor(detail?: string) {
    super(
      [
        "Linkwarden API token is invalid.",
        detail ?? "",
        "Ensure the token is the full JWT string copied from Linkwarden Settings → Access Tokens.",
      ]
        .filter(Boolean)
        .join(" ")
    )
    this.name = "LinkwardenInvalidTokenError"
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Thrown when the server returns 401 Unauthorized (expired or rejected token). */
export class LinkwardenExpiredTokenError extends LinkwardenAuthError {
  constructor() {
    super(
      "Linkwarden API returned 401 Unauthorized. " +
      "The token may be expired or invalid. " +
      "Generate a new one in Linkwarden → Settings → Access Tokens."
    )
    this.name = "LinkwardenExpiredTokenError"
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Thrown when the server returns 403 Forbidden. */
export class LinkwardenForbiddenError extends LinkwardenAuthError {
  constructor() {
    super(
      "Linkwarden API returned 403 Forbidden. " +
      "The token does not have permission to access this resource. " +
      "Verify you are accessing data belonging to the token owner."
    )
    this.name = "LinkwardenForbiddenError"
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ---------------------------------------------------------------------------
// Auth Handler
// ---------------------------------------------------------------------------

/** HTTP header map with the Authorization header. */
export interface LinkwardenAuthHeaders {
  Authorization: string
  [key: string]: string
}

/**
 * Reusable authentication handler for the Linkwarden REST API.
 *
 * @example
 * ```ts
 * const auth = new LinkwardenAuth(process.env.LINKWARDEN_TOKEN ?? "")
 * const response = await fetch(`${LINKWARDEN_BASE_URL}/api/v1/links`, {
 *   headers: auth.getHeaders(),
 * })
 * auth.handleResponse(response.status)
 * ```
 */
export class LinkwardenAuth {
  private token: string

  /**
   * Creates a new LinkwardenAuth instance.
   *
   * @param token - The Bearer token from Linkwarden → Settings → Access Tokens.
   *                Accepts an empty string to allow deferred initialization via
   *                {@link setToken}, but {@link getHeaders} will throw if the
   *                token is still empty when called.
   */
  constructor(token: string) {
    this.token = token
  }

  // -------------------------------------------------------------------------
  // Token management
  // -------------------------------------------------------------------------

  /**
   * Returns the stored Bearer token string.
   *
   * @returns The current token (may be an empty string if not yet set).
   */
  getToken(): string {
    return this.token
  }

  /**
   * Replaces the stored Bearer token.
   * Useful when rotating tokens without reinstantiating the client.
   *
   * @param token - The new Bearer token string.
   */
  setToken(token: string): void {
    this.token = token
  }

  // -------------------------------------------------------------------------
  // Request helpers
  // -------------------------------------------------------------------------

  /**
   * Validates the stored token and returns the `Authorization` header object
   * to spread into a `fetch` / `axios` headers config.
   *
   * @throws {@link LinkwardenMissingTokenError} if no token has been set.
   * @throws {@link LinkwardenInvalidTokenError} if the token is an empty string
   *         or contains only whitespace.
   *
   * @returns An object containing the `Authorization: Bearer {token}` header.
   *
   * @example
   * ```ts
   * const response = await fetch(url, { headers: auth.getHeaders() })
   * ```
   */
  getHeaders(): LinkwardenAuthHeaders {
    this.validateToken()
    return {
      Authorization: `Bearer ${this.token}`,
    }
  }

  // -------------------------------------------------------------------------
  // Response helpers
  // -------------------------------------------------------------------------

  /**
   * Inspects an HTTP response status code and throws a descriptive error for
   * authentication-related failures. Call this after every API response.
   *
   * @param status - The HTTP status code from the API response.
   *
   * @throws {@link LinkwardenExpiredTokenError} for status `401`.
   * @throws {@link LinkwardenForbiddenError} for status `403`.
   *
   * @example
   * ```ts
   * const response = await fetch(url, { headers: auth.getHeaders() })
   * auth.handleResponse(response.status) // throws if 401 or 403
   * const data = await response.json()
   * ```
   */
  handleResponse(status: number): void {
    if (status === 401) {
      throw new LinkwardenExpiredTokenError()
    }
    if (status === 403) {
      throw new LinkwardenForbiddenError()
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Validates the internal token before use.
   *
   * @throws {@link LinkwardenMissingTokenError} if the token is undefined / null.
   * @throws {@link LinkwardenInvalidTokenError} if the token is blank.
   */
  private validateToken(): void {
    // Catch undefined / null just in case, even though TypeScript says string.
    if (this.token === undefined || this.token === null) {
      throw new LinkwardenMissingTokenError()
    }

    const trimmed = this.token.trim()

    if (trimmed.length === 0) {
      if (this.token.length === 0) {
        throw new LinkwardenMissingTokenError()
      }
      throw new LinkwardenInvalidTokenError("Token contains only whitespace.")
    }
  }
}
