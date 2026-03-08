/**
 * Glassmorphism-styled date-range filter controls for Linkwarden links.
 *
 * Provides preset filter buttons (Last 7 days, Last 30 days, This month),
 * custom date inputs, a clear-filter button, and a filter status indicator.
 * Designed to work with the `useDateRangeFilter` hook.
 */

import React, { useState } from "react"
import { Calendar, X, Filter } from "lucide-react"
import type { UseDateRangeFilterReturn } from "@/src/hooks/useDateRangeFilter"
import {
  DATE_RANGE_PRESET_LABELS,
  type DateRangePreset,
} from "@/lib/linkwarden/dateFilter"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DateRangeFilterProps {
  filter: UseDateRangeFilterReturn
  className?: string
}

// ---------------------------------------------------------------------------
// Helper — format date for input[type="date"]
// ---------------------------------------------------------------------------

function toInputDate(date: Date | null): string {
  if (!date) return ""
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  filter,
  className = "",
}) => {
  const {
    activePreset,
    activeDateRange,
    isFiltered,
    validationError,
    filteredOutCount,
    selectPreset,
    setCustomRange,
    clearFilter,
  } = filter

  // Local state for custom date inputs
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  const presets = Object.entries(DATE_RANGE_PRESET_LABELS) as [
    Exclude<DateRangePreset, "custom">,
    string,
  ][]

  const handleCustomApply = () => {
    if (!customStart || !customEnd) return
    setCustomRange(new Date(customStart + "T00:00:00"), new Date(customEnd + "T23:59:59.999"))
  }

  return (
    <div
      className={`flex flex-col gap-3 px-4 py-3 rounded-lg ${className}`}
      style={{
        background: "rgba(3, 4, 8, 0.85)",
        backdropFilter: "blur(52px) saturate(1.8)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Row 1: Preset buttons + clear */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} style={{ color: "rgba(255,255,255,0.45)" }} />

        {presets.map(([key, label]) => {
          const isActive = activePreset === key
          return (
            <button
              key={key}
              onClick={() => selectPreset(key)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300"
              style={{
                border: "1px solid rgba(255,255,255,0.07)",
                color: isActive ? "#a3e635" : "rgba(255,255,255,0.92)",
                background: isActive
                  ? "rgba(163,230,53,0.12)"
                  : "rgba(255,255,255,0.05)",
                boxShadow: isActive
                  ? "0 0 12px rgba(var(--primary-rgb),0.3)"
                  : "none",
              }}
            >
              {label}
            </button>
          )
        })}

        {/* Custom range toggle */}
        <button
          onClick={() => {
            // If already custom, just clear; otherwise open custom inputs
            if (activePreset === "custom") {
              clearFilter()
            }
          }}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300"
          style={{
            border: "1px solid rgba(255,255,255,0.07)",
            color:
              activePreset === "custom"
                ? "#a3e635"
                : "rgba(255,255,255,0.92)",
            background:
              activePreset === "custom"
                ? "rgba(163,230,53,0.12)"
                : "rgba(255,255,255,0.05)",
            boxShadow:
              activePreset === "custom"
                ? "0 0 12px rgba(var(--primary-rgb),0.3)"
                : "none",
          }}
        >
          <Calendar size={12} className="inline mr-1" />
          Custom
        </button>

        {/* Clear button */}
        {isFiltered && (
          <button
            onClick={clearFilter}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ml-auto"
            style={{
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.6)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <X size={12} className="inline mr-1" />
            Clear
          </button>
        )}
      </div>

      {/* Row 2: Custom date inputs (always visible for easy access) */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={customStart || (activeDateRange ? toInputDate(activeDateRange.startDate) : "")}
          onChange={(e) => setCustomStart(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg outline-none transition-all duration-300"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.92)",
            colorScheme: "dark",
          }}
          aria-label="Filter start date"
        />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          to
        </span>
        <input
          type="date"
          value={customEnd || (activeDateRange ? toInputDate(activeDateRange.endDate) : "")}
          onChange={(e) => setCustomEnd(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg outline-none transition-all duration-300"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.92)",
            colorScheme: "dark",
          }}
          aria-label="Filter end date"
        />
        <button
          onClick={handleCustomApply}
          disabled={!customStart || !customEnd}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300"
          style={{
            border: "1px solid rgba(255,255,255,0.07)",
            color:
              customStart && customEnd
                ? "#a3e635"
                : "rgba(255,255,255,0.25)",
            background:
              customStart && customEnd
                ? "rgba(163,230,53,0.08)"
                : "transparent",
            cursor:
              customStart && customEnd ? "pointer" : "not-allowed",
            opacity: customStart && customEnd ? 1 : 0.5,
          }}
        >
          Apply
        </button>
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="text-xs" style={{ color: "#ef4444" }}>
          {validationError}
        </p>
      )}

      {/* Filter status */}
      {isFiltered && (
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          Showing filtered results &middot; {filteredOutCount} link
          {filteredOutCount !== 1 ? "s" : ""} hidden
        </p>
      )}
    </div>
  )
}
