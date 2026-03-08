/**
 * React hook for managing date-range filter state on Linkwarden links.
 *
 * Wraps the pure `filterLinksByDateRange` utility with React state
 * so UI components can select presets or custom ranges and instantly
 * see filtered results without re-fetching from the API.
 *
 * @example
 * ```ts
 * const { filteredLinks, activePreset, selectPreset, clearFilter } =
 *   useDateRangeFilter(allLinks)
 *
 * // User clicks "Last 7 days"
 * selectPreset("last7days")
 * ```
 */

import { useState, useMemo, useCallback } from "react"
import type { LinkwardenLink } from "@/lib/linkwarden/types"
import {
  filterLinksByDateRange,
  getPresetDateRange,
  validateDateRange,
  type DateRange,
  type DateRangePreset,
} from "@/lib/linkwarden/dateFilter"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseDateRangeFilterReturn {
  /** Links after the date filter is applied (all links if no filter active). */
  filteredLinks: LinkwardenLink[]
  /** The currently active preset (or "custom"), null if no filter. */
  activePreset: DateRangePreset | null
  /** The current date range, null if no filter active. */
  activeDateRange: DateRange | null
  /** Whether a date filter is currently active. */
  isFiltered: boolean
  /** Validation error for custom range, or null. */
  validationError: string | null
  /** The count of links removed by the filter. */
  filteredOutCount: number
  /** Select a preset filter. */
  selectPreset: (preset: Exclude<DateRangePreset, "custom">) => void
  /** Set a custom date range. */
  setCustomRange: (startDate: Date, endDate: Date) => void
  /** Clear all date filters and show all links. */
  clearFilter: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDateRangeFilter(
  links: LinkwardenLink[]
): UseDateRangeFilterReturn {
  const [activePreset, setActivePreset] = useState<DateRangePreset | null>(null)
  const [activeDateRange, setActiveDateRange] = useState<DateRange | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const filteredLinks = useMemo(() => {
    if (!activeDateRange) return links
    return filterLinksByDateRange(links, activeDateRange)
  }, [links, activeDateRange])

  const isFiltered = activeDateRange !== null

  const filteredOutCount = useMemo(
    () => links.length - filteredLinks.length,
    [links.length, filteredLinks.length]
  )

  const selectPreset = useCallback(
    (preset: Exclude<DateRangePreset, "custom">) => {
      const range = getPresetDateRange(preset)
      setActivePreset(preset)
      setActiveDateRange(range)
      setValidationError(null)
    },
    []
  )

  const setCustomRange = useCallback((startDate: Date, endDate: Date) => {
    const range: DateRange = { startDate, endDate }
    const error = validateDateRange(range)
    if (error) {
      setValidationError(error)
      return
    }
    setActivePreset("custom")
    setActiveDateRange(range)
    setValidationError(null)
  }, [])

  const clearFilter = useCallback(() => {
    setActivePreset(null)
    setActiveDateRange(null)
    setValidationError(null)
  }, [])

  return {
    filteredLinks,
    activePreset,
    activeDateRange,
    isFiltered,
    validationError,
    filteredOutCount,
    selectPreset,
    setCustomRange,
    clearFilter,
  }
}
