/**
 * Tests for Linkwarden Archive Upload Client
 *
 * Tests cover:
 * - Input validation (DES-64)
 * - Error handling (DES-66)
 * - Client instantiation and request construction (DES-63)
 */

import {
  LinkwardenArchiveClient,
  LinkwardenArchiveValidationError,
  LinkwardenArchiveError,
  LinkwardenArchiveResponseError,
  validateArchiveUploadParams,
} from "../archives"
import type { LinkwardenArchiveUploadParams } from "../types"

// ---------------------------------------------------------------------------
// Validation Tests (DES-64)
// ---------------------------------------------------------------------------

describe("validateArchiveUploadParams", () => {
  const validBlob = new Blob(["<html>test</html>"], { type: "text/html" })

  it("passes with valid Blob file and URL", () => {
    expect(() =>
      validateArchiveUploadParams({
        file: validBlob,
        url: "https://example.com/page",
      })
    ).not.toThrow()
  })

  it("passes with valid Buffer file and URL", () => {
    expect(() =>
      validateArchiveUploadParams({
        file: Buffer.from("<html>test</html>"),
        url: "https://example.com/page",
      })
    ).not.toThrow()
  })

  it("passes with http:// URL", () => {
    expect(() =>
      validateArchiveUploadParams({
        file: validBlob,
        url: "http://example.com/page",
      })
    ).not.toThrow()
  })

  // --- file validation ---

  it("throws when file is missing", () => {
    expect(() =>
      validateArchiveUploadParams({
        file: null as unknown as Blob,
        url: "https://example.com",
      })
    ).toThrow(LinkwardenArchiveValidationError)
  })

  it("throws when file is an empty Blob", () => {
    expect(() =>
      validateArchiveUploadParams({
        file: new Blob([]),
        url: "https://example.com",
      })
    ).toThrow(LinkwardenArchiveValidationError)
  })

  it("throws when file is an empty Buffer", () => {
    expect(() =>
      validateArchiveUploadParams({
        file: Buffer.alloc(0),
        url: "https://example.com",
      })
    ).toThrow(LinkwardenArchiveValidationError)
  })

  it("throws when file is not a File/Blob/Buffer", () => {
    expect(() =>
      validateArchiveUploadParams({
        file: "not a file" as unknown as Blob,
        url: "https://example.com",
      })
    ).toThrow(LinkwardenArchiveValidationError)
  })

  // --- URL validation ---

  it("throws when url is missing", () => {
    expect(() =>
      validateArchiveUploadParams({
        file: validBlob,
        url: "",
      })
    ).toThrow(LinkwardenArchiveValidationError)
  })

  it("throws when url is only whitespace", () => {
    expect(() =>
      validateArchiveUploadParams({
        file: validBlob,
        url: "   ",
      })
    ).toThrow(LinkwardenArchiveValidationError)
  })

  it("throws when url is invalid format", () => {
    expect(() =>
      validateArchiveUploadParams({
        file: validBlob,
        url: "not-a-url",
      })
    ).toThrow(LinkwardenArchiveValidationError)
  })

  it("throws when url uses ftp:// protocol", () => {
    expect(() =>
      validateArchiveUploadParams({
        file: validBlob,
        url: "ftp://example.com/file",
      })
    ).toThrow(LinkwardenArchiveValidationError)
  })

  it("includes field name in validation error", () => {
    try {
      validateArchiveUploadParams({
        file: validBlob,
        url: "not-a-url",
      })
    } catch (e) {
      expect(e).toBeInstanceOf(LinkwardenArchiveValidationError)
      expect((e as LinkwardenArchiveValidationError).field).toBe("url")
    }
  })
})

// ---------------------------------------------------------------------------
// Error Class Tests (DES-66)
// ---------------------------------------------------------------------------

describe("LinkwardenArchiveError", () => {
  it("preserves status and responseBody", () => {
    const err = new LinkwardenArchiveError("test error", 400, '{"error":"bad"}')
    expect(err.message).toBe("test error")
    expect(err.status).toBe(400)
    expect(err.responseBody).toBe('{"error":"bad"}')
    expect(err.name).toBe("LinkwardenArchiveError")
  })

  it("defaults status to null and responseBody to empty", () => {
    const err = new LinkwardenArchiveError("test")
    expect(err.status).toBeNull()
    expect(err.responseBody).toBe("")
  })

  it("is instanceof Error", () => {
    const err = new LinkwardenArchiveError("test")
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(LinkwardenArchiveError)
  })
})

describe("LinkwardenArchiveValidationError", () => {
  it("includes field name", () => {
    const err = new LinkwardenArchiveValidationError("file", "is missing")
    expect(err.field).toBe("file")
    expect(err.name).toBe("LinkwardenArchiveValidationError")
    expect(err).toBeInstanceOf(LinkwardenArchiveError)
  })
})

describe("LinkwardenArchiveResponseError", () => {
  it("is a subclass of LinkwardenArchiveError", () => {
    const err = new LinkwardenArchiveResponseError("bad response", 500, "body")
    expect(err).toBeInstanceOf(LinkwardenArchiveError)
    expect(err.name).toBe("LinkwardenArchiveResponseError")
  })
})

// ---------------------------------------------------------------------------
// Client Tests (DES-63)
// ---------------------------------------------------------------------------

describe("LinkwardenArchiveClient", () => {
  const config = {
    baseUrl: "https://linkwarden.example.com",
    bearerToken: "test-token-abc",
  }

  let client: LinkwardenArchiveClient

  beforeEach(() => {
    client = new LinkwardenArchiveClient(config)
    // Reset fetch mock
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("constructs the correct endpoint URL with format=4", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ response: { id: 42 } })),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    await client.upload({
      file: new Blob(["<html>test</html>"], { type: "text/html" }),
      url: "https://example.com/page",
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [calledUrl] = (global.fetch as jest.Mock).mock.calls[0]
    expect(calledUrl).toBe("https://linkwarden.example.com/api/v1/archives?format=4")
  })

  it("sends Authorization header with Bearer token", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ response: { id: 1 } })),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    await client.upload({
      file: new Blob(["<html>test</html>"], { type: "text/html" }),
      url: "https://example.com",
    })

    const [, options] = (global.fetch as jest.Mock).mock.calls[0]
    expect(options.headers.Authorization).toBe("Bearer test-token-abc")
  })

  it("sends POST method with FormData body", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ response: { id: 1 } })),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    await client.upload({
      file: new Blob(["<html>test</html>"], { type: "text/html" }),
      url: "https://example.com",
    })

    const [, options] = (global.fetch as jest.Mock).mock.calls[0]
    expect(options.method).toBe("POST")
    expect(options.body).toBeInstanceOf(FormData)
  })

  it("returns parsed archive result on success", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ response: { id: 42 } })),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    const result = await client.upload({
      file: new Blob(["<html>test</html>"], { type: "text/html" }),
      url: "https://example.com/page",
    })

    expect(result.success).toBe(true)
    expect(result.id).toBe(42)
    expect(result.url).toBe("https://example.com/page")
    expect(result.rawResponse).toBeDefined()
  })

  it("returns null id when API response has no id", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ response: {} })),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    const result = await client.upload({
      file: new Blob(["<html>test</html>"], { type: "text/html" }),
      url: "https://example.com",
    })

    expect(result.success).toBe(true)
    expect(result.id).toBeNull()
  })

  // --- Error handling ---

  it("throws validation error before making request for invalid input", async () => {
    await expect(
      client.upload({
        file: new Blob(["<html>test</html>"], { type: "text/html" }),
        url: "not-a-url",
      })
    ).rejects.toThrow(LinkwardenArchiveValidationError)

    // Should NOT have called fetch at all
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("throws LinkwardenArchiveError for 400 Bad Request", async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ message: "Bad request" })),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    await expect(
      client.upload({
        file: new Blob(["<html>test</html>"], { type: "text/html" }),
        url: "https://example.com",
      })
    ).rejects.toThrow(LinkwardenArchiveError)
  })

  it("throws LinkwardenArchiveError for 500 Server Error", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    await expect(
      client.upload({
        file: new Blob(["<html>test</html>"], { type: "text/html" }),
        url: "https://example.com",
      })
    ).rejects.toThrow(LinkwardenArchiveError)
  })

  it("throws network error when fetch fails", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error("DNS resolution failed"))

    await expect(
      client.upload({
        file: new Blob(["<html>test</html>"], { type: "text/html" }),
        url: "https://example.com",
      })
    ).rejects.toThrow(LinkwardenArchiveError)
  })

  it("throws LinkwardenArchiveResponseError for non-JSON response", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve("not json"),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    await expect(
      client.upload({
        file: new Blob(["<html>test</html>"], { type: "text/html" }),
        url: "https://example.com",
      })
    ).rejects.toThrow(LinkwardenArchiveResponseError)
  })

  it("throws for invalid response shape", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ data: "wrong shape" })),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    await expect(
      client.upload({
        file: new Blob(["<html>test</html>"], { type: "text/html" }),
        url: "https://example.com",
      })
    ).rejects.toThrow(LinkwardenArchiveResponseError)
  })

  // --- Token management ---

  it("allows token rotation via setToken", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ response: { id: 1 } })),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    client.setToken("new-token-xyz")

    await client.upload({
      file: new Blob(["<html>test</html>"], { type: "text/html" }),
      url: "https://example.com",
    })

    const [, options] = (global.fetch as jest.Mock).mock.calls[0]
    expect(options.headers.Authorization).toBe("Bearer new-token-xyz")
  })
})
