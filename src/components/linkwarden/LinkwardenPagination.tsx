/**
 * Glassmorphism-styled pagination controls for Linkwarden search results.
 *
 * Designed to work with the `useLinkwardenPagination` hook.
 * Renders Previous/Next buttons, page indicator, and an optional
 * page-size selector — all following the dashboard's glass design system.
 */

import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { UseLinkwardenPaginationReturn } from "@/src/hooks/useLinkwardenPagination"
import { LINKWARDEN_PAGE_SIZES } from "@/src/hooks/useLinkwardenPagination"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LinkwardenPaginationProps {
  pagination: UseLinkwardenPaginationReturn
  /** Hide the page-size selector. @default false */
  hidePageSize?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LinkwardenPagination: React.FC<LinkwardenPaginationProps> = ({
  pagination,
  hidePageSize = false,
  className = "",
}) => {
  const {
    currentPage,
    pageSize,
    hasPreviousPage,
    hasNextPage,
    totalPages,
    resultCount,
    goToPreviousPage,
    goToNextPage,
    setPageSize,
  } = pagination

  // Don't render if there's nothing to paginate
  if (resultCount === 0 && currentPage === 0) return null

  const pageLabel =
    totalPages !== null
      ? `Page ${currentPage + 1} of ${totalPages}`
      : `Page ${currentPage + 1}`

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg ${className}`}
      style={{
        background: "rgba(3, 4, 8, 0.85)",
        backdropFilter: "blur(52px) saturate(1.8)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Previous / Next */}
      <div className="flex items-center gap-2">
        <button
          onClick={goToPreviousPage}
          disabled={!hasPreviousPage}
          aria-label="Previous page"
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300"
          style={{
            border: "1px solid rgba(255,255,255,0.07)",
            color: hasPreviousPage
              ? "rgba(255,255,255,0.92)"
              : "rgba(255,255,255,0.25)",
            background: hasPreviousPage
              ? "rgba(255,255,255,0.05)"
              : "transparent",
            cursor: hasPreviousPage ? "pointer" : "not-allowed",
            opacity: hasPreviousPage ? 1 : 0.5,
          }}
        >
          <ChevronLeft size={14} />
          Prev
        </button>

        <button
          onClick={goToNextPage}
          disabled={!hasNextPage}
          aria-label="Next page"
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300"
          style={{
            border: "1px solid rgba(255,255,255,0.07)",
            color: hasNextPage
              ? "#a3e635"
              : "rgba(255,255,255,0.25)",
            background: hasNextPage
              ? "rgba(163,230,53,0.08)"
              : "transparent",
            boxShadow: hasNextPage
              ? "0 0 12px rgba(var(--primary-rgb),0.3)"
              : "none",
            cursor: hasNextPage ? "pointer" : "not-allowed",
            opacity: hasNextPage ? 1 : 0.5,
          }}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Page indicator */}
      <span
        className="text-xs"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {pageLabel}
        {resultCount > 0 && (
          <> &middot; {resultCount} result{resultCount !== 1 ? "s" : ""}</>
        )}
      </span>

      {/* Page size selector */}
      {!hidePageSize && (
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="px-2 py-1 text-xs rounded-lg outline-none transition-all duration-300"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.92)",
          }}
          aria-label="Results per page"
        >
          {LINKWARDEN_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
