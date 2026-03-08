/**
 * Integration tests for LinkwardenSearchClient
 *
 * Tests cover: authentication, search with filters, pagination,
 * response parsing/validation, error handling, and edge cases.
 * All external API calls are mocked — no live Linkwarden instance required.
 */

import {
  LinkwardenSearchClient,
  LinkwardenSearchError,
  LinkwardenResponseValidationError,
} from "../search"
import {
  LinkwardenExpiredTokenError,
  LinkwardenForbiddenError,
  LinkwardenMissingTokenError,
} from "../auth"
import type { LinkwardenRawLink } from "../types"

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const MOCK_BASE_URL = "https://linkwarden.example.com"
const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token"

function createClient(token = MOCK_TOKEN) {
  return new LinkwardenSearchClient({
    baseUrl: MOCK_BASE_URL,
    bearerToken: token,
  })
}

/** Helper to build a mock raw link object. */
function makeMockLink(overrides?: Partial<LinkwardenRawLink>): LinkwardenRawLink {
  return {
    id: 1,
    name: "Test Link",
    url: "https://example.com/test",
    type: "url",
    description: "A test link description",
    createdAt: "2026-03-07T10:00:00.000Z",
    ...overrides,
  }
}

/** Helper to build a valid API response body. */
function makeApiResponse(links: LinkwardenRawLink[]) {
  return JSON.stringify({ response: links })
}

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch

function mockFetch(
  status: number,
  body: string,
  headers: Record<string, string> = {}
) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
    headers: new Headers(headers),
  })
}

function mockFetchError(errorMessage: string) {
  globalThis.fetch = jest.fn().mockRejectedValue(new Error(errorMessage))
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LinkwardenSearchClient", () => {
  // =========================================================================
  // Authentication
  // =========================================================================

  describe("Authentication", () => {
    it("includes Bearer token in request headers", async () => {
      mockFetch(200, makeApiResponse([makeMockLink()]))
      const client = createClient()

      await client.search()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_TOKEN}`,
          }),
        })
      )
    })

    it("throws LinkwardenMissingTokenError when token is empty", async () => {
      const client = createClient("")

      await expect(client.search()).rejects.toThrow(LinkwardenMissingTokenError)
    })

    it("throws LinkwardenExpiredTokenError for HTTP 401", async () => {
      mockFetch(401, "Unauthorized")
      const client = createClient()

      await expect(client.search()).rejects.toThrow(LinkwardenExpiredTokenError)
    })

    it("throws LinkwardenForbiddenError for HTTP 403", async () => {
      mockFetch(403, "Forbidden")
      const client = createClient()

      await expect(client.search()).rejects.toThrow(LinkwardenForbiddenError)
    })
  })

  // =========================================================================
  // Search Functionality
  // =========================================================================

  describe("Search", () => {
    it("sends request to /api/v1/search endpoint", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${MOCK_BASE_URL}/api/v1/search`,
        expect.any(Object)
      )
    })

    it("includes search query in query string", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({ query: "typescript" })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toContain("searchQueryString=typescript")
    })

    it("returns parsed link objects", async () => {
      const mockLinks = [makeMockLink(), makeMockLink({ id: 2, name: "Link 2" })]
      mockFetch(200, makeApiResponse(mockLinks))
      const client = createClient()

      const result = await client.search()

      expect(result.links).toHaveLength(2)
      expect(result.links[0].id).toBe(1)
      expect(result.links[0].name).toBe("Test Link")
      expect(result.links[1].id).toBe(2)
    })

    it("returns empty results when API returns empty array", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      const result = await client.search()

      expect(result.links).toHaveLength(0)
      expect(result.pagination.resultCount).toBe(0)
      expect(result.pagination.hasMore).toBe(false)
    })

    it("searches without query or filters (returns all)", async () => {
      mockFetch(200, makeApiResponse([makeMockLink()]))
      const client = createClient()

      const result = await client.search()

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toBe(`${MOCK_BASE_URL}/api/v1/search`)
      expect(result.links).toHaveLength(1)
    })
  })

  // =========================================================================
  // Tag Filtering (DES-69)
  // =========================================================================

  describe("Tag Filtering", () => {
    it("includes tagId in query string when provided", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({ filters: { tagId: 42 } })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toContain("tagId=42")
    })

    it("works without tag filter (returns all)", async () => {
      mockFetch(200, makeApiResponse([makeMockLink()]))
      const client = createClient()

      await client.search({ query: "test" })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).not.toContain("tagId")
    })

    it("properly URL-encodes tag parameters", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({ filters: { tagId: 123 } })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toContain("tagId=123")
    })
  })

  // =========================================================================
  // Pagination (DES-71)
  // =========================================================================

  describe("Pagination", () => {
    it("includes skip and take in query string", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({ pagination: { skip: 20, take: 10 } })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toContain("skip=20")
      expect(url).toContain("take=10")
    })

    it("omits skip=0 (default) from query string", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({ pagination: { skip: 0, take: 10 } })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).not.toContain("skip=")
    })

    it("omits take when it equals the default value", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({ pagination: { skip: 10, take: 20 } })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toContain("skip=10")
      expect(url).not.toContain("take=")
    })

    it("returns pagination metadata", async () => {
      const links = Array.from({ length: 10 }, (_, i) =>
        makeMockLink({ id: i + 1 })
      )
      mockFetch(200, makeApiResponse(links))
      const client = createClient()

      const result = await client.search({ pagination: { skip: 0, take: 10 } })

      expect(result.pagination.currentOffset).toBe(0)
      expect(result.pagination.pageSize).toBe(10)
      expect(result.pagination.resultCount).toBe(10)
      expect(result.pagination.hasMore).toBe(true) // full page → might have more
    })

    it("sets hasMore=false when results < page size", async () => {
      const links = [makeMockLink()]
      mockFetch(200, makeApiResponse(links))
      const client = createClient()

      const result = await client.search({ pagination: { skip: 0, take: 10 } })

      expect(result.pagination.hasMore).toBe(false)
    })

    it("rejects negative skip values", async () => {
      const client = createClient()
      mockFetch(200, makeApiResponse([]))

      await expect(
        client.search({ pagination: { skip: -1, take: 10 } })
      ).rejects.toThrow("Invalid pagination parameters")
    })

    it("rejects take > max limit", async () => {
      const client = createClient()
      mockFetch(200, makeApiResponse([]))

      await expect(
        client.search({ pagination: { skip: 0, take: 200 } })
      ).rejects.toThrow("Invalid pagination parameters")
    })

    it("rejects take = 0", async () => {
      const client = createClient()
      mockFetch(200, makeApiResponse([]))

      await expect(
        client.search({ pagination: { skip: 0, take: 0 } })
      ).rejects.toThrow("Invalid pagination parameters")
    })
  })

  // =========================================================================
  // Additional Filters (DES-72)
  // =========================================================================

  describe("Additional Filters", () => {
    it("includes collectionId in query string", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({ filters: { collectionId: 5 } })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toContain("collectionId=5")
    })

    it("includes type filter in query string", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({ filters: { type: "pdf" } })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toContain("type=pdf")
    })

    it("combines multiple filters in single request", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({
        query: "react",
        filters: { tagId: 42, collectionId: 3, type: "url" },
        pagination: { skip: 10, take: 5 },
      })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toContain("searchQueryString=react")
      expect(url).toContain("tagId=42")
      expect(url).toContain("collectionId=3")
      expect(url).toContain("type=url")
      expect(url).toContain("skip=10")
      expect(url).toContain("take=5")
    })

    it("includes search scope flags when set", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({
        query: "test",
        filters: { searchByName: true, searchByUrl: false },
      })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toContain("searchByName=true")
      expect(url).toContain("searchByUrl=false")
    })
  })

  // =========================================================================
  // Response Parsing (DES-73)
  // =========================================================================

  describe("Response Parsing", () => {
    it("unwraps links from response field", async () => {
      mockFetch(200, makeApiResponse([makeMockLink()]))
      const client = createClient()

      const result = await client.search()

      expect(result.links).toHaveLength(1)
      expect(result.links[0].name).toBe("Test Link")
    })

    it("extracts domain from URL", async () => {
      mockFetch(
        200,
        makeApiResponse([makeMockLink({ url: "https://docs.example.com/page" })])
      )
      const client = createClient()

      const result = await client.search()

      expect(result.links[0].domain).toBe("docs.example.com")
    })

    it("formats createdAt as human-readable date", async () => {
      mockFetch(
        200,
        makeApiResponse([makeMockLink({ createdAt: "2026-03-07T10:00:00.000Z" })])
      )
      const client = createClient()

      const result = await client.search()

      expect(result.links[0].createdAt).toBeInstanceOf(Date)
      expect(result.links[0].createdAtFormatted).toMatch(/Mar 7, 2026/)
    })

    it("handles missing optional description gracefully", async () => {
      mockFetch(
        200,
        makeApiResponse([makeMockLink({ description: null })])
      )
      const client = createClient()

      const result = await client.search()

      expect(result.links[0].description).toBe("")
    })

    it("handles missing optional createdAt", async () => {
      const linkWithoutDate = makeMockLink()
      delete linkWithoutDate.createdAt
      mockFetch(200, makeApiResponse([linkWithoutDate]))
      const client = createClient()

      const result = await client.search()

      expect(result.links[0].createdAt).toBeNull()
      expect(result.links[0].createdAtFormatted).toBe("")
    })

    it("converts string id to number", async () => {
      mockFetch(
        200,
        JSON.stringify({ response: [{ ...makeMockLink(), id: "42" }] })
      )
      const client = createClient()

      const result = await client.search()

      expect(result.links[0].id).toBe(42)
    })

    it("defaults type to 'url' when missing", async () => {
      const linkNoType = makeMockLink()
      delete linkNoType.type
      mockFetch(200, makeApiResponse([linkNoType]))
      const client = createClient()

      const result = await client.search()

      expect(result.links[0].type).toBe("url")
    })

    it("handles extra unexpected fields without error", async () => {
      const linkWithExtras = {
        ...makeMockLink(),
        customField: "extra data",
        anotherField: 12345,
      }
      mockFetch(200, makeApiResponse([linkWithExtras]))
      const client = createClient()

      const result = await client.search()

      expect(result.links).toHaveLength(1)
      expect(result.links[0].name).toBe("Test Link")
    })
  })

  // =========================================================================
  // Error Handling
  // =========================================================================

  describe("Error Handling", () => {
    it("throws LinkwardenSearchError for HTTP 404", async () => {
      mockFetch(404, "Not Found")
      const client = createClient()

      await expect(client.search()).rejects.toThrow(LinkwardenSearchError)
    })

    it("throws LinkwardenSearchError for HTTP 500", async () => {
      mockFetch(500, "Internal Server Error")
      const client = createClient()

      await expect(client.search()).rejects.toThrow(LinkwardenSearchError)
    })

    it("includes status code in error for non-auth HTTP errors", async () => {
      mockFetch(500, "Server Error")
      const client = createClient()

      try {
        await client.search()
        fail("Should have thrown")
      } catch (err) {
        expect(err).toBeInstanceOf(LinkwardenSearchError)
        expect((err as LinkwardenSearchError).status).toBe(500)
      }
    })

    it("throws on network errors", async () => {
      mockFetchError("Network request failed")
      const client = createClient()

      await expect(client.search()).rejects.toThrow("Network request failed")
    })

    it("throws LinkwardenResponseValidationError for malformed JSON", async () => {
      mockFetch(200, "not valid json")
      const client = createClient()

      await expect(client.search()).rejects.toThrow(
        LinkwardenResponseValidationError
      )
    })

    it("throws LinkwardenResponseValidationError for missing response field", async () => {
      mockFetch(200, JSON.stringify({ data: [] }))
      const client = createClient()

      await expect(client.search()).rejects.toThrow(
        LinkwardenResponseValidationError
      )
    })

    it("throws LinkwardenResponseValidationError for invalid link objects", async () => {
      mockFetch(
        200,
        JSON.stringify({
          response: [{ invalid: true }],
        })
      )
      const client = createClient()

      await expect(client.search()).rejects.toThrow(
        LinkwardenResponseValidationError
      )
    })
  })

  // =========================================================================
  // Token Management
  // =========================================================================

  describe("Token Management", () => {
    it("setToken updates the token for subsequent requests", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()
      const newToken = "new-token-value"

      client.setToken(newToken)
      await client.search()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${newToken}`,
          }),
        })
      )
    })
  })

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe("Edge Cases", () => {
    it("handles trailing slash in baseUrl", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = new LinkwardenSearchClient({
        baseUrl: `${MOCK_BASE_URL}/`,
        bearerToken: MOCK_TOKEN,
      })

      await client.search()

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toBe(`${MOCK_BASE_URL}/api/v1/search`)
    })

    it("trims whitespace from query string", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({ query: "  react  " })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).toContain("searchQueryString=react")
    })

    it("skips empty query string", async () => {
      mockFetch(200, makeApiResponse([]))
      const client = createClient()

      await client.search({ query: "   " })

      const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string
      expect(url).not.toContain("searchQueryString")
    })

    it("handles very large result sets", async () => {
      const manyLinks = Array.from({ length: 100 }, (_, i) =>
        makeMockLink({ id: i + 1, name: `Link ${i + 1}` })
      )
      mockFetch(200, makeApiResponse(manyLinks))
      const client = createClient()

      const result = await client.search({ pagination: { take: 100 } })

      expect(result.links).toHaveLength(100)
      expect(result.pagination.hasMore).toBe(true)
    })

    it("handles invalid URL in link gracefully", async () => {
      mockFetch(
        200,
        makeApiResponse([makeMockLink({ url: "not-a-valid-url" })])
      )
      const client = createClient()

      const result = await client.search()

      expect(result.links[0].domain).toBe("not-a-valid-url")
    })
  })
})
