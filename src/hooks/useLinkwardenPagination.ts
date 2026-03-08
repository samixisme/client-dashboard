/**
 * Pagination state management hook for Linkwarden search results.
 *
 * Handles offset-based pagination despite the Linkwarden API's limitation
 * where `/api/v1/links` has hardcoded `take`/`skip` and no cursor info
 * (see GitHub Issue #1116).
 *
 * Uses the `/api/v1/search` endpoint which does accept `skip` and `take`.
 *
 * @example
 * ```ts
 * const pagination = useLinkwardenPagination({ initialPageSize: 20 })
 * const result = await client.search({
 *   pagination: { skip: pagination.skip, take: pagination.pageSize },
 * })
 * pagination.updateFromResult(result.pagination)
 * ```
 */

import { useState, useCallback, useMemo } from "react"
import type { LinkwardenPaginationMeta } from "@/lib/linkwarden/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseLinkwardenPaginationOptions {
  /** Initial page size. @default 20 */
  initialPageSize?: number
}

export interface UseLinkwardenPaginationReturn {
  /** Current 0-based page number. */
  currentPage: number
  /** Current page size (results per page). */
  pageSize: number
  /** Calculated skip value for the API request. */
  skip: number
  /** Whether a previous page exists. */
  hasPreviousPage: boolean
  /** Whether a next page exists (estimated from last result). */
  hasNextPage: boolean
  /** Estimated total pages (null if unknown). */
  totalPages: number | null
  /** Number of results on the current page. */
  resultCount: number
  /** Go to the previous page. */
  goToPreviousPage: () => void
  /** Go to the next page. */
  goToNextPage: () => void
  /** Go to a specific 0-based page number. */
  goToPage: (page: number) => void
  /** Change the page size (resets to page 0). */
  setPageSize: (size: number) => void
  /** Reset pagination to page 0. */
  reset: () => void
  /**
   * Update pagination state from an API result's pagination metadata.
   * Call this after each search to keep `hasNextPage` and `resultCount` in sync.
   */
  updateFromResult: (meta: LinkwardenPaginationMeta) => void
}

// ---------------------------------------------------------------------------
// Supported page sizes
// ---------------------------------------------------------------------------

export const LINKWARDEN_PAGE_SIZES = [10, 20, 50, 100] as const

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLinkwardenPagination(
  options?: UseLinkwardenPaginationOptions
): UseLinkwardenPaginationReturn {
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSizeState] = useState(
    options?.initialPageSize ?? 20
  )
  const [hasNextPage, setHasNextPage] = useState(false)
  const [resultCount, setResultCount] = useState(0)

  // Offset for the API
  const skip = useMemo(() => currentPage * pageSize, [currentPage, pageSize])

  const hasPreviousPage = currentPage > 0

  // We can't know total pages without a count endpoint — estimate from hasMore
  const totalPages: number | null = useMemo(() => {
    if (!hasNextPage && resultCount < pageSize) {
      // Last page — total is currentPage + 1
      return currentPage + 1
    }
    return null
  }, [hasNextPage, resultCount, pageSize, currentPage])

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((p) => Math.max(0, p - 1))
  }, [])

  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((p) => p + 1)
    }
  }, [hasNextPage])

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 0) {
        setCurrentPage(page)
      }
    },
    []
  )

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size)
    setCurrentPage(0) // Reset to first page on size change
  }, [])

  const reset = useCallback(() => {
    setCurrentPage(0)
    setHasNextPage(false)
    setResultCount(0)
  }, [])

  const updateFromResult = useCallback((meta: LinkwardenPaginationMeta) => {
    setHasNextPage(meta.hasMore)
    setResultCount(meta.resultCount)
  }, [])

  return {
    currentPage,
    pageSize,
    skip,
    hasPreviousPage,
    hasNextPage,
    totalPages,
    resultCount,
    goToPreviousPage,
    goToNextPage,
    goToPage,
    setPageSize,
    reset,
    updateFromResult,
  }
}
