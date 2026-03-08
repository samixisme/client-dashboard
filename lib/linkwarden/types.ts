/**
 * Linkwarden API Type Definitions
 *
 * TypeScript interfaces and Zod schemas for the Linkwarden search API.
 * These types align with the `/api/v1/search` endpoint response structure
 * documented in the Linkwarden API brief.
 *
 * @see docs/LINKWARDEN.md
 */

import { z } from "zod"

// ---------------------------------------------------------------------------
// Link Types
// ---------------------------------------------------------------------------

/**
 * Raw link object as returned by the Linkwarden API.
 *
 * Required fields: id, name, url
 * Optional fields: description, type, createdAt
 */
export interface LinkwardenRawLink {
  id: number
  name: string
  url: string
  type?: string
  description?: string | null
  createdAt?: string
  /** API may return additional fields not yet documented. */
  [key: string]: unknown
}

/**
 * Parsed link object for use within the dashboard application.
 * All fields are normalized and safe to render.
 */
export interface LinkwardenLink {
  id: number
  name: string
  url: string
  type: string
  description: string
  createdAt: Date | null
  /** Human-readable formatted date string, e.g. "Mar 7, 2026". */
  createdAtFormatted: string
  /** Domain extracted from the URL for compact display. */
  domain: string
}

// ---------------------------------------------------------------------------
// Collection Types
// ---------------------------------------------------------------------------

/**
 * Raw collection object exactly as returned by the Linkwarden API.
 * The API docs specify it returns id and name at minimum.
 */
export interface LinkwardenRawCollection {
  id: number
  name: string
  description?: string | null
  /** API may return additional fields not yet documented. */
  [key: string]: unknown
}

/**
 * Parsed collection object for use within the dashboard application.
 * All fields are normalized and safe to render.
 */
export interface LinkwardenCollection {
  id: number
  name: string
  description: string | null
}

// ---------------------------------------------------------------------------
// Archive Types
// ---------------------------------------------------------------------------

/**
 * Parameters for uploading an archived web page to Linkwarden.
 * Used by the `LinkwardenArchiveClient.upload()` method.
 */
export interface LinkwardenArchiveUploadParams {
  /**
   * The archived web page content as a File, Blob, or Buffer.
   * Typically a SingleFile .html archive.
   */
  file: File | Blob | Buffer
  /**
   * The original URL of the web page that was archived.
   * Must be a valid URL string (http:// or https://).
   */
  url: string
  /**
   * Optional filename for the uploaded archive.
   * If not provided, defaults to "archive.html".
   */
  filename?: string
}

/**
 * Raw archive response object as returned by the Linkwarden API
 * after a successful upload to POST /api/v1/archives?format=4.
 */
export interface LinkwardenRawArchiveResponse {
  /** The API wraps the archive in a `response` field. */
  response: {
    id?: number
    [key: string]: unknown
  }
}

/**
 * Parsed archive upload result for use within the dashboard application.
 */
export interface LinkwardenArchiveResult {
  /** Whether the upload was successful. */
  success: boolean
  /** The archive ID if returned by the API. */
  id: number | null
  /** The original URL that was archived. */
  url: string
  /** Raw API response for debugging. */
  rawResponse: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Search Parameters
// ---------------------------------------------------------------------------

/** Pagination options for search requests. */
export interface LinkwardenPaginationParams {
  /**
   * 0-based offset — number of results to skip.
   * @default 0
   */
  skip?: number
  /**
   * Maximum number of results per page.
   * Must be > 0 and <= {@link LINKWARDEN_MAX_TAKE}.
   * @default 20
   */
  take?: number
}

/**
 * All supported search filter parameters for the `/api/v1/search` endpoint.
 *
 * tagId is the primary documented filter. Additional filters (collectionId,
 * type, searchByName, searchByUrl, searchByDescription, searchByTextContent)
 * may be available depending on the Linkwarden version.
 */
export interface LinkwardenSearchFilters {
  /** Filter links by a specific tag ID. */
  tagId?: number
  /** Filter links by collection ID. */
  collectionId?: number
  /** Filter links by link type (e.g., "url", "pdf", "image"). */
  type?: string
  /** Search term to match against link names (server-side search). */
  searchByName?: boolean
  /** Search term to match against URLs (server-side search). */
  searchByUrl?: boolean
  /** Search term to match against descriptions (server-side search). */
  searchByDescription?: boolean
  /** Search term to match against text content (server-side search). */
  searchByTextContent?: boolean
}

/**
 * Combined search request parameters.
 * Merges the search query, filters, and pagination into one object.
 */
export interface LinkwardenSearchParams {
  /** Free-text search query. */
  query?: string
  /** Filter criteria. */
  filters?: LinkwardenSearchFilters
  /** Pagination options. */
  pagination?: LinkwardenPaginationParams
}

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------

/**
 * Raw API response shape from `/api/v1/collections`.
 * The API wraps the collection array in a `response` field.
 */
export interface LinkwardenCollectionsResponse {
  response: LinkwardenRawCollection[]
}

/**
 * Raw API response shape from `/api/v1/search`.
 * The API wraps the link array in a `response` field.
 */
export interface LinkwardenApiResponse {
  response: LinkwardenRawLink[]
}

/**
 * Pagination metadata computed client-side from the response.
 *
 * > **Known Limitation (GitHub Issue #1116):** The `/api/v1/links` endpoint
 * > has hardcoded `take`/`skip` parameters and does not return cursor info.
 * > Total count may not be available — `hasMore` is estimated by checking
 * > if the result count equals the requested `take` value.
 */
export interface LinkwardenPaginationMeta {
  /** The offset that was used in the request. */
  currentOffset: number
  /** The page size that was used in the request. */
  pageSize: number
  /** Number of results in the current page. */
  resultCount: number
  /**
   * Estimated flag — `true` if results.length === pageSize, indicating
   * more results may be available. Not guaranteed to be accurate due to
   * API limitations.
   */
  hasMore: boolean
}

/**
 * Parsed search response returned by the client.
 * Contains the normalized links and pagination metadata.
 */
export interface LinkwardenSearchResult {
  /** Parsed and validated link objects. */
  links: LinkwardenLink[]
  /** Pagination metadata for the current result set. */
  pagination: LinkwardenPaginationMeta
}

// ---------------------------------------------------------------------------
// Client Configuration
// ---------------------------------------------------------------------------

/** Configuration for the LinkwardenSearchClient. */
export interface LinkwardenClientConfig {
  /**
   * Base URL of the Linkwarden instance, without trailing slash.
   * @example "https://linkwarden.example.com"
   */
  baseUrl: string
  /**
   * Bearer token for API authentication.
   * Generate one in Linkwarden → Settings → Access Tokens.
   */
  bearerToken: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default number of results per page. */
export const LINKWARDEN_DEFAULT_TAKE = 20

/** Maximum allowed `take` value per request. */
export const LINKWARDEN_MAX_TAKE = 100

/** Search API path relative to base URL. */
export const LINKWARDEN_SEARCH_PATH = "/api/v1/search"

/** Collections API path relative to base URL. */
export const LINKWARDEN_COLLECTIONS_PATH = "/api/v1/collections"

/**
 * Deprecated links endpoint — use {@link LINKWARDEN_SEARCH_PATH} instead.
 * @deprecated Replaced by /api/v1/search
 */
export const LINKWARDEN_LINKS_PATH = "/api/v1/links"

/** Archives API path relative to base URL. */
export const LINKWARDEN_ARCHIVES_PATH = "/api/v1/archives"

/** SingleFile archive format parameter value. */
export const LINKWARDEN_ARCHIVE_FORMAT_SINGLEFILE = 4

// ---------------------------------------------------------------------------
// Zod Validation Schemas (use .safeParse(), never .parse())
// ---------------------------------------------------------------------------

/** Zod schema for validating a raw link object from the API. */
export const LinkwardenRawLinkSchema = z.object({
  id: z.union([z.number(), z.string().transform(Number)]),
  name: z.string(),
  url: z.string(),
  type: z.string().optional().default("url"),
  description: z.string().nullable().optional().default(null),
  createdAt: z.string().optional(),
}).passthrough()

/** Zod schema for validating a raw collection object from the API. */
export const LinkwardenRawCollectionSchema = z.object({
  id: z.union([z.number(), z.string().transform(Number)]),
  name: z.string(),
  description: z.string().nullable().optional().default(null),
}).passthrough()

/** Zod schema for validating the API response envelope. */
export const LinkwardenApiResponseSchema = z.object({
  response: z.array(LinkwardenRawLinkSchema),
})

/** Zod schema for validating the collections API response envelope. */
export const LinkwardenCollectionsResponseSchema = z.object({
  response: z.array(LinkwardenRawCollectionSchema),
})

/** Zod schema for validating pagination parameters before sending. */
export const LinkwardenPaginationSchema = z.object({
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(LINKWARDEN_MAX_TAKE).default(LINKWARDEN_DEFAULT_TAKE),
})

/** Zod schema for validating the archive upload API response envelope. */
export const LinkwardenArchiveResponseSchema = z.object({
  response: z.object({
    id: z.union([z.number(), z.string().transform(Number)]).optional(),
  }).passthrough(),
})
