/**
 * Linkwarden Client Library
 *
 * Re-exports authentication, search client, archive client, types, and error classes
 * for convenient access.
 *
 * @example
 * ```ts
 * import { LinkwardenSearchClient, LinkwardenAuth, LinkwardenArchiveClient } from "@/lib/linkwarden"
 * ```
 */

export { LinkwardenAuth, LinkwardenMissingTokenError, LinkwardenInvalidTokenError, LinkwardenExpiredTokenError, LinkwardenForbiddenError } from "./auth"
export { LinkwardenSearchClient, LinkwardenSearchError, LinkwardenResponseValidationError } from "./search"
export { LinkwardenCollectionsClient, LinkwardenCollectionError, LinkwardenCollectionValidationError } from "./collections"
export { LinkwardenArchiveClient, LinkwardenArchiveError, LinkwardenArchiveValidationError, LinkwardenArchiveResponseError, validateArchiveUploadParams } from "./archives"
export { filterLinksByDateRange, getPresetDateRange, validateDateRange, DATE_RANGE_PRESET_LABELS } from "./dateFilter"
export type { DateRange, DateRangePreset } from "./dateFilter"
export type {
  LinkwardenLink,
  LinkwardenRawLink,
  LinkwardenCollection,
  LinkwardenRawCollection,
  LinkwardenCollectionsResponse,
  LinkwardenArchiveUploadParams,
  LinkwardenRawArchiveResponse,
  LinkwardenArchiveResult,
  LinkwardenSearchParams,
  LinkwardenSearchFilters,
  LinkwardenPaginationParams,
  LinkwardenSearchResult,
  LinkwardenPaginationMeta,
  LinkwardenClientConfig,
  LinkwardenApiResponse,
} from "./types"
export {
  LINKWARDEN_DEFAULT_TAKE,
  LINKWARDEN_MAX_TAKE,
  LINKWARDEN_SEARCH_PATH,
  LINKWARDEN_COLLECTIONS_PATH,
  LINKWARDEN_LINKS_PATH,
  LINKWARDEN_ARCHIVES_PATH,
  LINKWARDEN_ARCHIVE_FORMAT_SINGLEFILE,
} from "./types"

