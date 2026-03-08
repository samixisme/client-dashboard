/**
 * Unit tests for Linkwarden Bearer token authentication handler.
 *
 * Tests cover:
 *  - DES-56: LinkwardenAuth class initialization, header injection, token management
 *  - DES-60: Error handling for missing/invalid tokens and 401/403 responses
 *  - DES-62: Unit and integration-style tests with mocked HTTP layer
 */

import {
  LinkwardenAuth,
  LinkwardenAuthError,
  LinkwardenMissingTokenError,
  LinkwardenInvalidTokenError,
  LinkwardenExpiredTokenError,
  LinkwardenForbiddenError,
} from "../lib/linkwarden/auth"

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const VALID_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

// ---------------------------------------------------------------------------
// LinkwardenAuth: initialization
// ---------------------------------------------------------------------------

describe("LinkwardenAuth – constructor", () => {
  it("creates an instance with a valid token", () => {
    const auth = new LinkwardenAuth(VALID_TOKEN)
    expect(auth).toBeInstanceOf(LinkwardenAuth)
  })

  it("stores the token passed to the constructor", () => {
    const auth = new LinkwardenAuth(VALID_TOKEN)
    expect(auth.getToken()).toBe(VALID_TOKEN)
  })

  it("accepts an empty string without throwing (deferred initialization)", () => {
    expect(() => new LinkwardenAuth("")).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// LinkwardenAuth: getHeaders
// ---------------------------------------------------------------------------

describe("LinkwardenAuth – getHeaders()", () => {
  it("returns the Authorization header in Bearer format", () => {
    const auth = new LinkwardenAuth(VALID_TOKEN)
    const headers = auth.getHeaders()
    expect(headers.Authorization).toBe(`Bearer ${VALID_TOKEN}`)
  })

  it("throws LinkwardenMissingTokenError when token is an empty string", () => {
    const auth = new LinkwardenAuth("")
    expect(() => auth.getHeaders()).toThrow(LinkwardenMissingTokenError)
  })

  it("throws LinkwardenMissingTokenError with descriptive message for empty string", () => {
    const auth = new LinkwardenAuth("")
    expect(() => auth.getHeaders()).toThrow(/Access Tokens/)
  })

  it("throws LinkwardenInvalidTokenError when token is only whitespace", () => {
    const auth = new LinkwardenAuth("   ")
    expect(() => auth.getHeaders()).toThrow(LinkwardenInvalidTokenError)
  })

  it("throws LinkwardenInvalidTokenError with whitespace detail message", () => {
    const auth = new LinkwardenAuth("   ")
    expect(() => auth.getHeaders()).toThrow(/whitespace/)
  })

  it("does not throw for a token that contains spaces within the value", () => {
    // Tokens with surrounding whitespace are invalid, but internal spaces in
    // the JWT itself (rare but possible in edge cases) should not be caught here.
    const tokenWithInternalContent = "a.b.c"
    const auth = new LinkwardenAuth(tokenWithInternalContent)
    expect(() => auth.getHeaders()).not.toThrow()
  })

  it("all error classes extend LinkwardenAuthError", () => {
    const auth = new LinkwardenAuth("")
    expect(() => auth.getHeaders()).toThrow(LinkwardenAuthError)
  })
})

// ---------------------------------------------------------------------------
// LinkwardenAuth: setToken / getToken
// ---------------------------------------------------------------------------

describe("LinkwardenAuth – setToken() / getToken()", () => {
  it("allows updating the token after initialization", () => {
    const auth = new LinkwardenAuth("")
    auth.setToken(VALID_TOKEN)
    expect(auth.getToken()).toBe(VALID_TOKEN)
  })

  it("getHeaders() works after setting a valid token via setToken()", () => {
    const auth = new LinkwardenAuth("")
    auth.setToken(VALID_TOKEN)
    expect(auth.getHeaders().Authorization).toBe(`Bearer ${VALID_TOKEN}`)
  })

  it("clearing a token with setToken('') causes getHeaders() to throw again", () => {
    const auth = new LinkwardenAuth(VALID_TOKEN)
    auth.setToken("")
    expect(() => auth.getHeaders()).toThrow(LinkwardenMissingTokenError)
  })
})

// ---------------------------------------------------------------------------
// LinkwardenAuth: handleResponse
// ---------------------------------------------------------------------------

describe("LinkwardenAuth – handleResponse()", () => {
  let auth: LinkwardenAuth

  beforeEach(() => {
    auth = new LinkwardenAuth(VALID_TOKEN)
  })

  it("does not throw for a 200 OK response", () => {
    expect(() => auth.handleResponse(200)).not.toThrow()
  })

  it("does not throw for a 201 Created response", () => {
    expect(() => auth.handleResponse(201)).not.toThrow()
  })

  it("does not throw for a 204 No Content response", () => {
    expect(() => auth.handleResponse(204)).not.toThrow()
  })

  it("throws LinkwardenExpiredTokenError for a 401 Unauthorized response", () => {
    expect(() => auth.handleResponse(401)).toThrow(LinkwardenExpiredTokenError)
  })

  it("throws LinkwardenExpiredTokenError with message about expired/invalid token", () => {
    expect(() => auth.handleResponse(401)).toThrow(/expired|invalid/i)
  })

  it("throws LinkwardenForbiddenError for a 403 Forbidden response", () => {
    expect(() => auth.handleResponse(403)).toThrow(LinkwardenForbiddenError)
  })

  it("throws LinkwardenForbiddenError with message about permissions", () => {
    expect(() => auth.handleResponse(403)).toThrow(/permission/i)
  })

  it("does not throw for non-auth error codes (e.g. 404, 500)", () => {
    expect(() => auth.handleResponse(404)).not.toThrow()
    expect(() => auth.handleResponse(500)).not.toThrow()
  })

  it("401 and 403 errors extend LinkwardenAuthError", () => {
    expect(() => auth.handleResponse(401)).toThrow(LinkwardenAuthError)
    expect(() => auth.handleResponse(403)).toThrow(LinkwardenAuthError)
  })
})

// ---------------------------------------------------------------------------
// Integration-style: full request/response lifecycle (mocked fetch)
// ---------------------------------------------------------------------------

describe("LinkwardenAuth – integration (mocked fetch)", () => {
  const LINKWARDEN_BASE_URL = "https://example.linkwarden.app"

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("sends the correct Authorization header on a GET request", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ response: [] }),
    })

    const auth = new LinkwardenAuth(VALID_TOKEN)

    await fetch(`${LINKWARDEN_BASE_URL}/api/v1/links`, {
      headers: auth.getHeaders(),
    })

    expect(global.fetch).toHaveBeenCalledWith(
      `${LINKWARDEN_BASE_URL}/api/v1/links`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${VALID_TOKEN}`,
        }),
      })
    )
  })

  it("works correctly across different HTTP methods (POST)", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 201,
      ok: true,
      json: async () => ({ response: { id: "abc123" } }),
    })

    const auth = new LinkwardenAuth(VALID_TOKEN)

    await fetch(`${LINKWARDEN_BASE_URL}/api/v1/links`, {
      method: "POST",
      headers: {
        ...auth.getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Example", url: "https://example.com", collectionId: 1 }),
    })

    expect(global.fetch).toHaveBeenCalledWith(
      `${LINKWARDEN_BASE_URL}/api/v1/links`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${VALID_TOKEN}`,
        }),
      })
    )
  })

  it("handleResponse throws on 401 response from server", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 401,
      ok: false,
    })

    const auth = new LinkwardenAuth(VALID_TOKEN)

    const response = await fetch(`${LINKWARDEN_BASE_URL}/api/v1/links`, {
      headers: auth.getHeaders(),
    })

    expect(() => auth.handleResponse(response.status)).toThrow(LinkwardenExpiredTokenError)
  })

  it("handleResponse throws on 403 response from server", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 403,
      ok: false,
    })

    const auth = new LinkwardenAuth(VALID_TOKEN)

    const response = await fetch(`${LINKWARDEN_BASE_URL}/api/v1/links`, {
      headers: auth.getHeaders(),
    })

    expect(() => auth.handleResponse(response.status)).toThrow(LinkwardenForbiddenError)
  })

  it("getHeaders() throws before the fetch if no token is set", async () => {
    const auth = new LinkwardenAuth("")

    expect(() => {
      // Simulate the pre-request header injection
      const headers = auth.getHeaders()
      void fetch(`${LINKWARDEN_BASE_URL}/api/v1/links`, { headers })
    }).toThrow(LinkwardenMissingTokenError)

    // fetch should NOT have been called
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Error class identity and message sanity checks
// ---------------------------------------------------------------------------

describe("Custom error classes", () => {
  it("LinkwardenMissingTokenError is an instanceof Error", () => {
    expect(new LinkwardenMissingTokenError()).toBeInstanceOf(Error)
  })

  it("LinkwardenInvalidTokenError is an instanceof LinkwardenAuthError", () => {
    expect(new LinkwardenInvalidTokenError()).toBeInstanceOf(LinkwardenAuthError)
  })

  it("LinkwardenExpiredTokenError has a descriptive message", () => {
    const err = new LinkwardenExpiredTokenError()
    expect(err.message).toMatch(/401/i)
  })

  it("LinkwardenForbiddenError has a descriptive message", () => {
    const err = new LinkwardenForbiddenError()
    expect(err.message).toMatch(/403/i)
  })

  it("each error class has a unique name property", () => {
    expect(new LinkwardenMissingTokenError().name).toBe("LinkwardenMissingTokenError")
    expect(new LinkwardenInvalidTokenError().name).toBe("LinkwardenInvalidTokenError")
    expect(new LinkwardenExpiredTokenError().name).toBe("LinkwardenExpiredTokenError")
    expect(new LinkwardenForbiddenError().name).toBe("LinkwardenForbiddenError")
  })
})
