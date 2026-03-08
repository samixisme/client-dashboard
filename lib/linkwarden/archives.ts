/**
 * Linkwarden Archive Upload Client
 *
 * Typed HTTP client for the Linkwarden `POST /api/v1/archives?format=4` endpoint.
 * Handles authenticated multipart form data uploads for SingleFile web archives,
 * input validation, and structured error handling.
 *
 * @example
 * ```ts
 * import { LinkwardenArchiveClient } from "@/lib/linkwarden"
 *
 * const client = new LinkwardenArchiveClient({
 *   baseUrl: "https://linkwarden.example.com",
 *   bearerToken: process.env.LINKWARDEN_TOKEN!,
 * })
 *
 * const result = await client.upload({
 *   file: archiveBlob,
 *   url: "https://example.com/page",
 * })
 * ```
 */

import { LinkwardenAuth } from "./auth"
import type {
  LinkwardenClientConfig,
  LinkwardenArchiveUploadParams,
  LinkwardenArchiveResult,
} from "./types"
import {
  LINKWARDEN_ARCHIVES_PATH,
  LINKWARDEN_ARCHIVE_FORMAT_SINGLEFILE,
  LinkwardenArchiveResponseSchema,
} from "./types"

// ---------------------------------------------------------------------------
// Custom Error Classes
// ---------------------------------------------------------------------------

/** Base class for all Linkwarden archive upload errors. */
export class LinkwardenArchiveError extends Error {
  readonly status: number | null
  readonly responseBody: string

  constructor(message: string, status: number | null = null, responseBody = "") {
    super(message)
    this.name = "LinkwardenArchiveError"
    this.status = status
    this.responseBody = responseBody
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Thrown when archive upload input validation fails. */
export class LinkwardenArchiveValidationError extends LinkwardenArchiveError {
  readonly field: string

  constructor(field: string, message: string) {
    super(`Archive upload validation failed: ${message}`)
    this.name = "LinkwardenArchiveValidationError"
    this.field = field
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Thrown when the server response cannot be parsed or is unexpected. */
export class LinkwardenArchiveResponseError extends LinkwardenArchiveError {
  constructor(message: string, status: number | null = null, responseBody = "") {
    super(message, status, responseBody)
    this.name = "LinkwardenArchiveResponseError"
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates archive upload parameters before sending the request.
 *
 * @param params - The upload parameters to validate.
 * @throws {@link LinkwardenArchiveValidationError} if any parameter is invalid.
 */
export function validateArchiveUploadParams(
  params: LinkwardenArchiveUploadParams
): void {
  // --- file validation ---
  if (!params.file) {
    throw new LinkwardenArchiveValidationError(
      "file",
      "File is required. Provide a File, Blob, or Buffer containing the archived web page."
    )
  }

  // Check file is a valid type (File, Blob, or Buffer)
  const isFile =
    typeof File !== "undefined" && params.file instanceof File
  const isBlob =
    typeof Blob !== "undefined" && params.file instanceof Blob
  const isBuffer = Buffer.isBuffer(params.file)

  if (!isFile && !isBlob && !isBuffer) {
    throw new LinkwardenArchiveValidationError(
      "file",
      "File must be a File, Blob, or Buffer instance."
    )
  }

  // Check file is not empty
  if (isFile || isBlob) {
    if ((params.file as Blob).size === 0) {
      throw new LinkwardenArchiveValidationError(
        "file",
        "File is empty. Provide a non-empty archive file."
      )
    }
  } else if (isBuffer) {
    if ((params.file as Buffer).length === 0) {
      throw new LinkwardenArchiveValidationError(
        "file",
        "Buffer is empty. Provide a non-empty archive buffer."
      )
    }
  }

  // --- url validation ---
  if (!params.url || typeof params.url !== "string") {
    throw new LinkwardenArchiveValidationError(
      "url",
      "URL is required. Provide the original URL of the archived web page."
    )
  }

  const trimmedUrl = params.url.trim()
  if (trimmedUrl.length === 0) {
    throw new LinkwardenArchiveValidationError(
      "url",
      "URL cannot be empty or whitespace-only."
    )
  }

  // Validate URL format without network connectivity
  try {
    const parsed = new URL(trimmedUrl)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new LinkwardenArchiveValidationError(
        "url",
        `URL protocol must be http or https, got "${parsed.protocol}".`
      )
    }
  } catch (e) {
    if (e instanceof LinkwardenArchiveValidationError) {
      throw e
    }
    throw new LinkwardenArchiveValidationError(
      "url",
      `Invalid URL format: "${trimmedUrl}". Must be a valid http:// or https:// URL.`
    )
  }
}

// ---------------------------------------------------------------------------
// Error Interpretation
// ---------------------------------------------------------------------------

/**
 * Interprets an HTTP response from the archive upload endpoint
 * and throws a descriptive error for failure responses.
 *
 * @param status - HTTP status code.
 * @param body - Raw response body text.
 * @throws {@link LinkwardenArchiveError} for 4xx/5xx responses.
 */
function interpretArchiveError(status: number, body: string): void {
  // Try to parse Linkwarden error message from JSON
  let serverMessage = ""
  try {
    const parsed = JSON.parse(body)
    serverMessage =
      parsed?.response?.message ??
      parsed?.message ??
      parsed?.error ??
      ""
  } catch {
    // Body is not JSON — will use raw body in error
  }

  if (status >= 400 && status < 500) {
    const detail = serverMessage || body.slice(0, 200)
    throw new LinkwardenArchiveError(
      `Archive upload rejected by server (${status} Client Error). ${detail}`,
      status,
      body
    )
  }

  if (status >= 500) {
    const detail = serverMessage || "The server encountered an internal error."
    throw new LinkwardenArchiveError(
      `Archive upload failed due to server error (${status}). ${detail}`,
      status,
      body
    )
  }
}

// ---------------------------------------------------------------------------
// Archive Client
// ---------------------------------------------------------------------------

/**
 * Typed HTTP client for the Linkwarden `POST /api/v1/archives` endpoint.
 *
 * Features:
 * - Bearer token authentication (via {@link LinkwardenAuth})
 * - Multipart form data upload with `file` and `url` fields
 * - SingleFile format support (`format=4` query parameter)
 * - Input validation before request
 * - Structured error handling (client vs server errors)
 * - Zod-validated response parsing (always `.safeParse()`)
 *
 * @example
 * ```ts
 * const client = new LinkwardenArchiveClient({
 *   baseUrl: "https://linkwarden.example.com",
 *   bearerToken: "your-token",
 * })
 *
 * const result = await client.upload({
 *   file: fs.readFileSync("page.html"),
 *   url: "https://example.com/page",
 * })
 *
 * if (result.success) {
 *   console.log("Archive created with ID:", result.id)
 * }
 * ```
 */
export class LinkwardenArchiveClient {
  private readonly baseUrl: string
  private readonly auth: LinkwardenAuth

  /**
   * @param config - Client configuration with baseUrl and bearerToken.
   */
  constructor(config: LinkwardenClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "") // strip trailing slashes
    this.auth = new LinkwardenAuth(config.bearerToken)
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Uploads an archived web page to Linkwarden.
   *
   * @param params - Upload parameters including file and original URL.
   * @returns Parsed archive result with success status and ID.
   *
   * @throws {@link LinkwardenArchiveValidationError} if inputs are invalid.
   * @throws {@link LinkwardenArchiveError} for HTTP errors (4xx/5xx).
   * @throws {@link LinkwardenArchiveResponseError} if the response cannot be parsed.
   *
   * @example
   * ```ts
   * const result = await client.upload({
   *   file: new Blob(["<html>...</html>"], { type: "text/html" }),
   *   url: "https://example.com/page",
   * })
   * ```
   */
  async upload(
    params: LinkwardenArchiveUploadParams
  ): Promise<LinkwardenArchiveResult> {
    // Phase 1: Validate inputs before making any network call
    validateArchiveUploadParams(params)

    // Phase 2: Build multipart form data
    const formData = this.buildFormData(params)

    // Phase 3: Build the endpoint URL with format=4 query parameter
    const url = this.buildEndpointUrl()

    // Phase 4: Execute the authenticated POST request
    let response: Response
    try {
      response = await this.executeRequest(url, formData)
    } catch (error) {
      // Network errors (DNS failure, connection refused, timeout)
      if (error instanceof LinkwardenArchiveError) {
        throw error
      }
      const message =
        error instanceof Error ? error.message : String(error)
      throw new LinkwardenArchiveError(
        `Archive upload failed due to network error: ${message}`,
        null,
        ""
      )
    }

    // Phase 5: Read and validate the response
    const body = await response.text()

    // Check for auth errors first (401/403)
    this.auth.handleResponse(response.status)

    // Check for other HTTP errors
    if (!response.ok) {
      interpretArchiveError(response.status, body)
    }

    // Phase 6: Parse and validate the response
    return this.parseResponse(body, params.url)
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
   * Builds the endpoint URL with the format=4 query parameter.
   */
  private buildEndpointUrl(): string {
    return `${this.baseUrl}${LINKWARDEN_ARCHIVES_PATH}?format=${LINKWARDEN_ARCHIVE_FORMAT_SINGLEFILE}`
  }

  /**
   * Constructs multipart form data from the upload parameters.
   */
  private buildFormData(params: LinkwardenArchiveUploadParams): FormData {
    const formData = new FormData()
    const filename = params.filename ?? "archive.html"

    // Handle different file types
    if (Buffer.isBuffer(params.file)) {
      // Copy Buffer data into a plain ArrayBuffer to satisfy the BlobPart type constraint.
      // Buffer.buffer may be SharedArrayBuffer which is incompatible with Blob constructor.
      const ab = new ArrayBuffer(params.file.byteLength)
      const view = new Uint8Array(ab)
      for (let i = 0; i < params.file.byteLength; i++) {
        view[i] = params.file[i]
      }
      const blob = new Blob([ab], { type: "text/html" })
      formData.append("file", blob, filename)
    } else {
      // File or Blob — append directly
      formData.append("file", params.file, filename)
    }

    formData.append("url", params.url.trim())

    return formData
  }

  /**
   * Executes an authenticated POST request to the Linkwarden API.
   * Does NOT set Content-Type — the browser/runtime will set it
   * automatically with the correct multipart boundary.
   */
  private async executeRequest(
    url: string,
    formData: FormData
  ): Promise<Response> {
    const authHeaders = this.auth.getHeaders()

    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeaders.Authorization,
        // Do NOT set Content-Type — FormData sets it with boundary automatically
      },
      body: formData,
    })
  }

  /**
   * Parses and validates the API response body.
   *
   * Uses Zod `.safeParse()` per project conventions — never `.parse()`.
   */
  private parseResponse(
    body: string,
    originalUrl: string
  ): LinkwardenArchiveResult {
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      throw new LinkwardenArchiveResponseError(
        "Archive upload response is not valid JSON.",
        null,
        body.slice(0, 500)
      )
    }

    const result = LinkwardenArchiveResponseSchema.safeParse(parsed)

    if (!result.success) {
      // Response doesn't match expected shape but may still be a success
      // Log the Zod errors and return a best-effort result
      const zodErrors = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")

      throw new LinkwardenArchiveResponseError(
        `Archive upload response failed validation: ${zodErrors}`,
        null,
        body.slice(0, 500)
      )
    }

    return {
      success: true,
      id: result.data.response.id ?? null,
      url: originalUrl,
      rawResponse: parsed as Record<string, unknown>,
    }
  }
}
