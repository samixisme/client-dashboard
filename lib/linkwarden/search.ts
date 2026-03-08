/**
 * Linkwarden Search API Client
 *
 * Typed HTTP client for the Linkwarden `/api/v1/search` endpoint.
 * Handles authenticated requests with Bearer tokens, query parameter
 * construction, response validation, and pagination.
 *
 * Uses the existing `LinkwardenAuth` handler from `./auth.ts` for
 * header generation and response error handling.
 *
 * @example
 * ```ts
 * import { LinkwardenSearchClient } from "@/lib/linkwarden/search"
 *
 * const client = new LinkwardenSearchClient({
 *   baseUrl: "https://linkwarden.example.com",
 *   bearerToken: process.env.LINKWARDEN_TOKEN ?? "",
 * })
 *
 * const result = await client.search({ query: "react" })
 * console.log(result.links) // LinkwardenLink[]
 * ```
 */

import { LinkwardenAuth } from "./auth"
import {
  type LinkwardenClientConfig,
  type LinkwardenLink,
  type LinkwardenPaginationMeta,
  type LinkwardenPaginationParams,
  type LinkwardenRawLink,
  type LinkwardenSearchFilters,
  type LinkwardenSearchParams,
  type LinkwardenSearchResult,
  LINKWARDEN_DEFAULT_TAKE,
  LINKWARDEN_SEARCH_PATH,
  LinkwardenApiResponseSchema,
  LinkwardenPaginationSchema,
} from "./types"

// ---------------------------------------------------------------------------
// Custom Error
// ---------------------------------------------------------------------------

/** Thrown when the Linkwarden Search API returns a non-auth error. */
export class LinkwardenSearchError extends Error {
  /** HTTP status code from the API response. */
  readonly status: number
  /** Raw response body text (may be empty). */
  readonly responseBody: string

  constructor(status: number, responseBody: string) {
    super(
      `Linkwarden Search API returned HTTP ${status}. ` +
      `Response: ${responseBody.slice(0, 200)}`
    )
    this.name = "LinkwardenSearchError"
    this.status = status
    this.responseBody = responseBody
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Thrown when the API response fails validation. */
export class LinkwardenResponseValidationError extends Error {
  /** Zod validation issues formatted as a string. */
  readonly validationErrors: string

  constructor(validationErrors: string) {
    super(
      `Linkwarden API response failed validation. ` +
      `Errors: ${validationErrors}`
    )
    this.name = "LinkwardenResponseValidationError"
    this.validationErrors = validationErrors
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the domain from a URL string.
 * Returns the original string if parsing fails.
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * Formats a date as a human-readable string (e.g., "Mar 7, 2026").
 */
function formatDate(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Parses and normalizes a raw link object into a `LinkwardenLink`.
 */
function parseRawLink(raw: LinkwardenRawLink): LinkwardenLink {
  const createdAt = raw.createdAt ? new Date(raw.createdAt) : null
  const validDate = createdAt && !isNaN(createdAt.getTime()) ? createdAt : null

  return {
    id: typeof raw.id === "string" ? Number(raw.id) : raw.id,
    name: raw.name ?? "",
    url: raw.url ?? "",
    type: raw.type ?? "url",
    description: raw.description ?? "",
    createdAt: validDate,
    createdAtFormatted: formatDate(validDate),
    domain: extractDomain(raw.url ?? ""),
  }
}

// ---------------------------------------------------------------------------
// Search Client
// ---------------------------------------------------------------------------

/**
 * Typed HTTP client for the Linkwarden `/api/v1/search` endpoint.
 *
 * Features:
 * - Bearer token authentication (via {@link LinkwardenAuth})
 * - Tag-based filtering (`tagId`)
 * - Additional filters (collection, type, search scope)
 * - Pagination with `skip`/`take`
 * - Zod-validated response parsing (always `.safeParse()`)
 * - Descriptive error handling
 *
 * > **Deprecation Note:** The `/api/v1/links` endpoint is deprecated.
 * > This client exclusively uses `/api/v1/search` as recommended.
 */
export class LinkwardenSearchClient {
  private readonly auth: LinkwardenAuth
  private readonly baseUrl: string

  /**
   * @param config - Client configuration with baseUrl and bearerToken.
   */
  constructor(config: LinkwardenClientConfig) {
    // Strip trailing slash from baseUrl
    this.baseUrl = config.baseUrl.replace(/\/+$/, "")
    this.auth = new LinkwardenAuth(config.bearerToken)
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Searches for links using the `/api/v1/search` endpoint.
   *
   * @param params - Optional search query, filters, and pagination.
   * @returns Parsed links and pagination metadata.
   *
   * @throws {@link LinkwardenSearchError} for non-auth HTTP errors.
   * @throws {@link LinkwardenResponseValidationError} if response fails validation.
   * @throws Auth errors from {@link LinkwardenAuth.handleResponse} for 401/403.
   *
   * @example
   * ```ts
   * // Simple search
   * const result = await client.search({ query: "typescript" })
   *
   * // Search with tag filter and pagination
   * const result = await client.search({
   *   query: "react",
   *   filters: { tagId: 42 },
   *   pagination: { skip: 0, take: 10 },
   * })
   * ```
   */
  async search(params?: LinkwardenSearchParams): Promise<LinkwardenSearchResult> {
    const queryString = this.buildQueryString(params)
    const url = `${this.baseUrl}${LINKWARDEN_SEARCH_PATH}${queryString}`

    const response = await this.executeRequest(url)
    const rawBody = await response.text()

    // Parse JSON
    let json: unknown
    try {
      json = JSON.parse(rawBody)
    } catch {
      throw new LinkwardenResponseValidationError(
        `Response is not valid JSON: ${rawBody.slice(0, 200)}`
      )
    }

    // Validate response structure with Zod (.safeParse, never .parse)
    const parseResult = LinkwardenApiResponseSchema.safeParse(json)
    if (!parseResult.success) {
      throw new LinkwardenResponseValidationError(
        parseResult.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")
      )
    }

    // Parse raw links into normalized LinkwardenLink objects
    const links = parseResult.data.response.map(parseRawLink)

    // Build pagination metadata
    const pagination = this.buildPaginationMeta(params?.pagination, links.length)

    return { links, pagination }
  }

  /**
   * Updates the Bearer token for future requests.
   * Useful for token rotation without re-instantiating the client.
   */
  setToken(token: string): void {
    this.auth.setToken(token)
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Constructs the query string from search parameters.
   * Uses URLSearchParams for proper URL encoding.
   */
  private buildQueryString(params?: LinkwardenSearchParams): string {
    const searchParams = new URLSearchParams()

    if (!params) return ""

    // Search query
    if (params.query && params.query.trim().length > 0) {
      searchParams.set("searchQueryString", params.query.trim())
    }

    // Filters
    if (params.filters) {
      this.applyFilters(searchParams, params.filters)
    }

    // Pagination — validate with Zod before adding
    if (params.pagination) {
      this.applyPagination(searchParams, params.pagination)
    }

    const qs = searchParams.toString()
    return qs.length > 0 ? `?${qs}` : ""
  }

  /**
   * Applies filter parameters to the URLSearchParams object.
   */
  private applyFilters(
    searchParams: URLSearchParams,
    filters: LinkwardenSearchFilters
  ): void {
    if (filters.tagId !== undefined && filters.tagId !== null) {
      searchParams.set("tagId", String(filters.tagId))
    }

    if (filters.collectionId !== undefined && filters.collectionId !== null) {
      searchParams.set("collectionId", String(filters.collectionId))
    }

    if (filters.type !== undefined && filters.type.trim().length > 0) {
      searchParams.set("type", filters.type.trim())
    }

    if (filters.searchByName !== undefined) {
      searchParams.set("searchByName", String(filters.searchByName))
    }

    if (filters.searchByUrl !== undefined) {
      searchParams.set("searchByUrl", String(filters.searchByUrl))
    }

    if (filters.searchByDescription !== undefined) {
      searchParams.set("searchByDescription", String(filters.searchByDescription))
    }

    if (filters.searchByTextContent !== undefined) {
      searchParams.set("searchByTextContent", String(filters.searchByTextContent))
    }
  }

  /**
   * Validates and applies pagination parameters.
   * Uses `.safeParse()` per project conventions — never `.parse()`.
   *
   * > **Known Limitation (GitHub Issue #1116):**
   * > Cursor-based pagination is not available.
   * > Only offset-based pagination with `skip` and `take` is supported.
   */
  private applyPagination(
    searchParams: URLSearchParams,
    pagination: LinkwardenPaginationParams
  ): void {
    const result = LinkwardenPaginationSchema.safeParse(pagination)

    if (!result.success) {
      const errorDetails = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")
      throw new Error(`Invalid pagination parameters: ${errorDetails}`)
    }

    const { skip, take } = result.data

    // Only include non-default values to reduce request size
    if (skip > 0) {
      searchParams.set("skip", String(skip))
    }

    if (take !== LINKWARDEN_DEFAULT_TAKE) {
      searchParams.set("take", String(take))
    }
  }

  /**
   * Executes an authenticated GET request to the Linkwarden API.
   */
  private async executeRequest(url: string): Promise<Response> {
    const headers = this.auth.getHeaders()

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    })

    // Let auth handler throw for 401/403
    this.auth.handleResponse(response.status)

    // Handle other non-2xx errors
    if (!response.ok) {
      const body = await response.text()
      throw new LinkwardenSearchError(response.status, body)
    }

    return response
  }

  /**
   * Computes pagination metadata from the request params and result count.
   */
  private buildPaginationMeta(
    pagination: LinkwardenPaginationParams | undefined,
    resultCount: number
  ): LinkwardenPaginationMeta {
    const pageSize = pagination?.take ?? LINKWARDEN_DEFAULT_TAKE
    const currentOffset = pagination?.skip ?? 0

    return {
      currentOffset,
      pageSize,
      resultCount,
      // Estimate: if we got a full page, there might be more
      hasMore: resultCount >= pageSize,
    }
  }
}
