import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Tag as TagIcon } from 'lucide-react';
import { FileTag } from '../../types/drive';
import { TAG_COLORS, getTagColorClasses } from '../../utils/tagColors';
import { useFileTags } from '../../hooks/useFileTags';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TagManagerProps {
  projectId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const TagManager: React.FC<TagManagerProps> = ({ projectId = 'default' }) => {
  const { tags, isLoading, createTag, deleteTag } = useFileTags(projectId);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].id);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!newTagName.trim()) return;
    setIsCreating(true);
    try {
      await createTag(newTagName.trim(), selectedColor, projectId);
      setNewTagName('');
      setSelectedColor(TAG_COLORS[0].id);
      setShowForm(false);
    } finally {
      setIsCreating(false);
    }
  }, [newTagName, selectedColor, projectId, createTag]);

  const handleDelete = useCallback(async (tagId: string) => {
    if (!confirm('Delete this tag? It will be removed from all files.')) return;
    await deleteTag(tagId);
  }, [deleteTag]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') setShowForm(false);
  }, [handleCreate]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <TagIcon size={14} className="text-primary" />
          Tags
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-1 rounded-lg hover:bg-glass-light transition-colors text-text-secondary hover:text-primary"
          aria-label="Add new tag"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="p-3 rounded-xl bg-glass/40 border border-border-color space-y-2.5">
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tag name..."
            className="w-full px-3 py-1.5 rounded-lg bg-glass border border-border-color text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
            autoFocus
          />

          {/* Color picker */}
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c.id)}
                className={`w-5 h-5 rounded-full ${c.dot} transition-all ${
                  selectedColor === c.id
                    ? 'ring-2 ring-offset-2 ring-offset-transparent ring-primary scale-110'
                    : 'opacity-60 hover:opacity-100'
                }`}
                aria-label={`Select ${c.label} color`}
              />
            ))}
          </div>

          <button
            onClick={handleCreate}
            disabled={!newTagName.trim() || isCreating}
            className="w-full py-1.5 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-40"
          >
            {isCreating ? 'Creating...' : 'Create Tag'}
          </button>
        </div>
      )}

      {/* Tag list */}
      {isLoading ? (
        <div className="text-xs text-text-secondary animate-pulse">Loading tags...</div>
      ) : tags.length === 0 ? (
        <div className="text-xs text-text-secondary/60 italic">No tags yet</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const colors = getTagColorClasses(tag.color);
            return (
              <span
                key={tag.id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                {tag.name}
                {tag.fileCount !== undefined && tag.fileCount > 0 && (
                  <span className="opacity-60 ml-0.5">({tag.fileCount})</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }}
                  className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity"
                  aria-label={`Delete ${tag.name} tag`}
                >
                  <Trash2 size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TagManager;
