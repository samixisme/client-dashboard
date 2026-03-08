/**
 * Linkwarden Collections API Client
 * 
 * Typed HTTP client for the Linkwarden `/api/v1/collections` endpoint.
 * Retrieves collections with proper authentication and error handling.
 */

import { LinkwardenAuth } from "./auth"
import {
  type LinkwardenClientConfig,
  type LinkwardenCollection,
  type LinkwardenRawCollection,
  LINKWARDEN_COLLECTIONS_PATH,
  LinkwardenCollectionsResponseSchema,
} from "./types"

// ---------------------------------------------------------------------------
// Custom Errors
// ---------------------------------------------------------------------------

/** Thrown when the Linkwarden Collections API returns a non-auth error. */
export class LinkwardenCollectionError extends Error {
  /** HTTP status code from the API response. */
  readonly status: number
  /** Raw response body text (may be empty). */
  readonly responseBody: string

  constructor(status: number, responseBody: string) {
    super(
      `Linkwarden Collections API returned HTTP ${status}. ` +
      `Response: ${responseBody.slice(0, 200)}`
    )
    this.name = "LinkwardenCollectionError"
    this.status = status
    this.responseBody = responseBody
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Thrown when the collections API response fails validation. */
export class LinkwardenCollectionValidationError extends Error {
  /** Zod validation issues formatted as a string. */
  readonly validationErrors: string

  constructor(validationErrors: string) {
    super(
      `Linkwarden Collections API response failed validation. ` +
      `Errors: ${validationErrors}`
    )
    this.name = "LinkwardenCollectionValidationError"
    this.validationErrors = validationErrors
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses and normalizes a raw collection object.
 */
function parseRawCollection(raw: LinkwardenRawCollection): LinkwardenCollection {
  return {
    id: typeof raw.id === "string" ? Number(raw.id) : raw.id,
    name: raw.name ?? "",
    description: raw.description ?? null,
  }
}

// ---------------------------------------------------------------------------
// Collections Client
// ---------------------------------------------------------------------------

export class LinkwardenCollectionsClient {
  private readonly auth: LinkwardenAuth
  private readonly baseUrl: string

  constructor(config: LinkwardenClientConfig) {
    // Strip trailing slash from baseUrl
    this.baseUrl = config.baseUrl.replace(/\/+$/, "")
    this.auth = new LinkwardenAuth(config.bearerToken)
  }

  /**
   * Fetches all collections for the authenticated user.
   * 
   * @returns Parsed collections.
   * 
   * @throws {@link LinkwardenCollectionError} for non-auth HTTP errors.
   * @throws {@link LinkwardenCollectionValidationError} if response fails validation.
   * @throws Auth errors from {@link LinkwardenAuth.handleResponse} for 401/403.
   */
  async getCollections(): Promise<LinkwardenCollection[]> {
    const url = `${this.baseUrl}${LINKWARDEN_COLLECTIONS_PATH}`
    
    let response: Response
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          ...this.auth.getHeaders(),
          "Content-Type": "application/json",
        },
      })
    } catch (error) {
      throw new Error(`Network error while fetching collections: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Let auth handler throw for 401/403
    this.auth.handleResponse(response.status)

    // Handle other non-2xx errors
    if (!response.ok) {
      const body = await response.text()
      throw new LinkwardenCollectionError(response.status, body)
    }

    const rawBody = await response.text()

    // Parse JSON
    let json: unknown
    try {
      json = JSON.parse(rawBody)
    } catch {
      throw new LinkwardenCollectionValidationError(
        `Response is not valid JSON: ${rawBody.slice(0, 200)}`
      )
    }

    // Validate response structure with Zod (.safeParse, never .parse)
    const parseResult = LinkwardenCollectionsResponseSchema.safeParse(json)
    if (!parseResult.success) {
      throw new LinkwardenCollectionValidationError(
        parseResult.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")
      )
    }

    // Parse raw collections into normalized objects
    return parseResult.data.response.map(parseRawCollection)
  }

  /**
   * Updates the Bearer token for future requests.
   * Useful for token rotation without re-instantiating the client.
   */
  setToken(token: string): void {
    this.auth.setToken(token)
  }
}
