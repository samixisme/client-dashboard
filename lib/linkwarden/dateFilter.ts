/**
 * Client-side date-range filtering for Linkwarden links.
 *
 * The Linkwarden API does not support date-range filtering as a query
 * parameter. This module provides utilities to filter already-fetched
 * link results by their `createdAt` timestamp on the client side.
 *
 * @see DES-70 — Implement client-side date-range filtering
 */

import type { LinkwardenLink } from "./types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Start/end boundaries for date-range filtering. */
export interface DateRange {
  /** Inclusive start (links on this day are included). */
  startDate: Date
  /** Inclusive end (links on this day are included). */
  endDate: Date
}

/** Preset filter period identifiers. */
export type DateRangePreset =
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "custom"

// ---------------------------------------------------------------------------
// Preset helpers
// ---------------------------------------------------------------------------

/**
 * Computes start/end dates for a preset filter period.
 * All ranges are inclusive with start at 00:00:00 and end at 23:59:59.999.
 */
export function getPresetDateRange(preset: Exclude<DateRangePreset, "custom">): DateRange {
  const now = new Date()
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23, 59, 59, 999
  )

  switch (preset) {
    case "last7days": {
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 6)
      startDate.setHours(0, 0, 0, 0)
      return { startDate, endDate }
    }
    case "last30days": {
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 29)
      startDate.setHours(0, 0, 0, 0)
      return { startDate, endDate }
    }
    case "thisMonth": {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      return { startDate, endDate }
    }
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates that a date range is logically correct.
 * Returns an error message string if invalid, or `null` if valid.
 */
export function validateDateRange(range: DateRange): string | null {
  if (!(range.startDate instanceof Date) || isNaN(range.startDate.getTime())) {
    return "Start date is not a valid date"
  }
  if (!(range.endDate instanceof Date) || isNaN(range.endDate.getTime())) {
    return "End date is not a valid date"
  }
  if (range.startDate > range.endDate) {
    return "Start date must be before or equal to end date"
  }
  return null
}

// ---------------------------------------------------------------------------
// Core filter
// ---------------------------------------------------------------------------

/**
 * Filters an array of parsed Linkwarden links by a date range.
 *
 * Uses the `createdAt` field (already parsed to `Date | null`).
 * Links without a valid `createdAt` are **excluded** when a filter is active.
 *
 * @param links - Array of parsed LinkwardenLink objects.
 * @param range - Start and end dates (inclusive).
 * @returns Filtered subset of links within the date range.
 */
export function filterLinksByDateRange(
  links: LinkwardenLink[],
  range: DateRange
): LinkwardenLink[] {
  const validationError = validateDateRange(range)
  if (validationError) {
    // Invalid range — return unfiltered to avoid silent data loss
    return links
  }

  // Normalize boundaries to full-day inclusion
  const start = new Date(range.startDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(range.endDate)
  end.setHours(23, 59, 59, 999)

  return links.filter((link) => {
    if (!link.createdAt) return false
    const ts = link.createdAt.getTime()
    return ts >= start.getTime() && ts <= end.getTime()
  })
}

/** Human-readable label map for preset filters. */
export const DATE_RANGE_PRESET_LABELS: Record<Exclude<DateRangePreset, "custom">, string> = {
  last7days: "Last 7 days",
  last30days: "Last 30 days",
  thisMonth: "This month",
}
