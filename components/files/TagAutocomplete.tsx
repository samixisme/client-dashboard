import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Tag as TagIcon, Search } from 'lucide-react';
import { FileTag } from '../../types/drive';
import { getTagColorClasses } from '../../utils/tagColors';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TagAutocompleteProps {
  /** All available tags to suggest from */
  availableTags: FileTag[];
  /** Tags currently assigned to the file */
  assignedTags: FileTag[];
  /** Callback when a tag is selected (assign) */
  onAssign: (tag: FileTag) => void;
  /** Callback when a tag is removed (unassign) */
  onRemove: (tagId: string) => void;
  /** Callback when user creates a new tag inline */
  onCreateNew?: (name: string) => void;
  /** If true, show loading state */
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const TagAutocomplete: React.FC<TagAutocompleteProps> = ({
  availableTags,
  assignedTags,
  onAssign,
  onRemove,
  onCreateNew,
  isLoading = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const assignedIds = useMemo(() => new Set(assignedTags.map((t) => t.id)), [assignedTags]);

  // Filter suggestions: exclude already-assigned, case-insensitive match
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return availableTags
      .filter((t) => !assignedIds.has(t.id) && t.name.toLowerCase().includes(lower))
      .slice(0, 10);
  }, [query, availableTags, assignedIds]);

  const showCreateOption = query.trim() &&
    !availableTags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightIndex(0);
  }, [suggestions.length]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Debounce to 300ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(value);
      setIsOpen(value.trim().length > 0);
    }, 300);
    // Immediate visual update
    setQuery(value);
    if (value.trim()) setIsOpen(true);
  }, []);

  const handleSelect = useCallback((tag: FileTag) => {
    onAssign(tag);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onAssign]);

  const handleCreateNew = useCallback(() => {
    if (onCreateNew && query.trim()) {
      onCreateNew(query.trim());
      setQuery('');
      setIsOpen(false);
    }
  }, [onCreateNew, query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = suggestions.length + (showCreateOption ? 1 : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) => Math.min(prev + 1, totalItems - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex < suggestions.length) {
          handleSelect(suggestions[highlightIndex]);
        } else if (showCreateOption) {
          handleCreateNew();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
    }
  }, [suggestions, highlightIndex, showCreateOption, handleSelect, handleCreateNew]);

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Assigned tag chips */}
      {assignedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {assignedTags.map((tag) => {
            const colors = getTagColorClasses(tag.color);
            return (
              <span
                key={tag.id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                {tag.name}
                <button
                  onClick={() => onRemove(tag.id)}
                  className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${tag.name} tag`}
                >
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-text-secondary/50" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (query.trim()) setIsOpen(true); }}
            placeholder="Add tag..."
            className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-glass border border-border-color text-text-primary text-xs placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-colors"
            role="combobox"
            aria-expanded={isOpen}
            aria-label="Search and add tags"
            aria-controls="tag-suggestions"
          />
          {isLoading && (
            <div className="absolute right-2.5 w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
          )}
        </div>

        {/* Dropdown suggestions */}
        {isOpen && (suggestions.length > 0 || showCreateOption) && (
          <ul
            id="tag-suggestions"
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg bg-glass/90 backdrop-blur-xl border border-border-color shadow-xl"
          >
            {suggestions.map((tag, i) => {
              const colors = getTagColorClasses(tag.color);
              return (
                <li
                  key={tag.id}
                  role="option"
                  aria-selected={i === highlightIndex}
                  onClick={() => handleSelect(tag)}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs transition-colors ${
                    i === highlightIndex ? 'bg-primary/10 text-primary' : 'text-text-primary hover:bg-glass-light'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <span>{tag.name}</span>
                  {tag.fileCount !== undefined && tag.fileCount > 0 && (
                    <span className="ml-auto text-text-secondary/50 text-[10px]">{tag.fileCount} files</span>
                  )}
                </li>
              );
            })}
            {showCreateOption && (
              <li
                role="option"
                aria-selected={highlightIndex === suggestions.length}
                onClick={handleCreateNew}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs border-t border-border-color transition-colors ${
                  highlightIndex === suggestions.length ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-glass-light'
                }`}
              >
                <Plus size={12} />
                <span>Create &quot;{query.trim()}&quot;</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TagAutocomplete;
