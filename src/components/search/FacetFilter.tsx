/**
 * FacetFilter & FacetSidebar Components
 *
 * Checkbox-based facet filtering with:
 * - Multi-select with counts
 * - Collapsible sections
 * - "Clear all" per facet
 * - Search within facet values
 * - Pinned facets at top
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

// ── FacetFilter ────────────────────────────────────────────────────────

export interface FacetFilterProps {
  facetKey: string;
  label: string;
  values: Record<string, number>;
  selected: string[];
  onChange: (values: string[]) => void;
  defaultExpanded?: boolean;
}

export const FacetFilter: React.FC<FacetFilterProps> = ({
  facetKey,
  label,
  values,
  selected,
  onChange,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [searchTerm, setSearchTerm] = useState('');

  const entries = useMemo(() => {
    const all = Object.entries(values).sort(([, a], [, b]) => b - a);
    if (!searchTerm) return all;
    const lower = searchTerm.toLowerCase();
    return all.filter(([key]) => key.toLowerCase().includes(lower));
  }, [values, searchTerm]);

  const showSearch = Object.keys(values).length > 6;

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="facet-filter">
      <button
        className="facet-filter__header"
        onClick={() => setExpanded(!expanded)}
        type="button"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="facet-filter__label">{label}</span>
        {selected.length > 0 && (
          <span className="facet-filter__count">{selected.length}</span>
        )}
        {selected.length > 0 && (
          <button
            className="facet-filter__clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            type="button"
            title="Clear all"
            aria-label={`Clear all ${label} filters`}
          >
            <X size={12} />
          </button>
        )}
      </button>

      {expanded && (
        <div className="facet-filter__body">
          {showSearch && (
            <input
              type="text"
              className="facet-filter__search"
              placeholder={`Search ${label.toLowerCase()}…`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          )}

          <div className="facet-filter__options">
            {entries.map(([value, count]) => (
              <label key={value} className="facet-filter__option">
                <input
                  type="checkbox"
                  checked={selected.includes(value)}
                  onChange={() => handleToggle(value)}
                />
                <span className="facet-filter__value">{value}</span>
                <span className="facet-filter__value-count">{count}</span>
              </label>
            ))}

            {entries.length === 0 && (
              <p className="facet-filter__empty">No values found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── FacetSidebar ───────────────────────────────────────────────────────

export interface FacetSidebarProps {
  facets: Record<string, Record<string, Record<string, number>>>;
  selectedFilters: Record<string, string[]>;
  onFilterChange: (facetKey: string, values: string[]) => void;
  onClearAll: () => void;
  pinnedFacets?: string[];
}

const FACET_LABELS: Record<string, string> = {
  status: 'Status',
  priority: 'Priority',
  industry: 'Industry',
  type: 'Type',
  projectId: 'Project',
  assignee: 'Assignee',
  clientId: 'Client',
};

export const FacetSidebar: React.FC<FacetSidebarProps> = ({
  facets,
  selectedFilters,
  onFilterChange,
  onClearAll,
  pinnedFacets = ['status'],
}) => {
  // Flatten facets from all indexes
  const mergedFacets = useMemo(() => {
    const merged: Record<string, Record<string, number>> = {};

    for (const indexFacets of Object.values(facets)) {
      for (const [facetKey, facetValues] of Object.entries(indexFacets)) {
        if (!merged[facetKey]) {
          merged[facetKey] = {};
        }
        for (const [value, count] of Object.entries(facetValues)) {
          merged[facetKey][value] = (merged[facetKey][value] || 0) + count;
        }
      }
    }

    return merged;
  }, [facets]);

  const hasActiveFilters = Object.values(selectedFilters).some((v) => v.length > 0);

  // Sort: pinned facets first, then alphabetical
  const sortedFacetKeys = useMemo(() => {
    const keys = Object.keys(mergedFacets);
    return keys.sort((a, b) => {
      const aPinned = pinnedFacets.includes(a);
      const bPinned = pinnedFacets.includes(b);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.localeCompare(b);
    });
  }, [mergedFacets, pinnedFacets]);

  if (sortedFacetKeys.length === 0) return null;

  return (
    <aside className="facet-sidebar">
      <div className="facet-sidebar__header">
        <h3>Filters</h3>
        {hasActiveFilters && (
          <button
            className="facet-sidebar__clear-all"
            onClick={onClearAll}
            type="button"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="facet-sidebar__filters">
        {sortedFacetKeys.map((key) => (
          <FacetFilter
            key={key}
            facetKey={key}
            label={FACET_LABELS[key] || key}
            values={mergedFacets[key]}
            selected={selectedFilters[key] || []}
            onChange={(values) => onFilterChange(key, values)}
            defaultExpanded={pinnedFacets.includes(key)}
          />
        ))}
      </div>
    </aside>
  );
};
