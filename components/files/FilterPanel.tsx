import React from 'react';
import { motion } from 'framer-motion';
import { Check, Image, Film, FileText, FileType, Archive, Code2 } from 'lucide-react';
import { UseFileFiltersReturn } from '../../hooks/useFileFilters';
import { DriveFileType, DriveSizeRange, DriveDateRange } from '../../types/drive';

interface FilterPanelProps extends UseFileFiltersReturn {
  availableOwners: string[];
}

const FILE_TYPE_OPTIONS: { value: DriveFileType; label: string; icon: React.ReactNode }[] = [
  { value: 'image',    label: 'Images',     icon: <Image className="w-3.5 h-3.5 text-primary" /> },
  { value: 'video',    label: 'Videos',     icon: <Film className="w-3.5 h-3.5 text-primary" /> },
  { value: 'document', label: 'Documents',  icon: <FileText className="w-3.5 h-3.5 text-primary" /> },
  { value: 'pdf',      label: 'PDFs',       icon: <FileType className="w-3.5 h-3.5 text-primary" /> },
  { value: 'archive',  label: 'Archives',   icon: <Archive className="w-3.5 h-3.5 text-primary" /> },
  { value: 'code',     label: 'Code',       icon: <Code2 className="w-3.5 h-3.5 text-primary" /> },
];

const SIZE_OPTIONS: { value: DriveSizeRange; label: string }[] = [
  { value: '<1mb',     label: '< 1 MB' },
  { value: '1-10mb',   label: '1 – 10 MB' },
  { value: '10-100mb', label: '10 – 100 MB' },
  { value: '>100mb',   label: '> 100 MB' },
];

const DATE_OPTIONS: { value: DriveDateRange; label: string }[] = [
  { value: 'today',  label: 'Today' },
  { value: 'last7',  label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
];

/**
 * FilterPanel — purely controlled panel body.
 * The parent is responsible for:
 *  1. Rendering the "Filters" toggle button.
 *  2. Wrapping this component in <AnimatePresence> + <motion.div> for the slide animation.
 *
 * This component renders only the filter content grid.
 */
const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  setFileType,
  setSizeRange,
  setDateRange,
  setOwner,
  availableOwners,
}) => {
  const toggleType = (type: DriveFileType) => {
    const current = filters.fileType ?? [];
    if (current.includes(type)) {
      setFileType(current.filter(t => t !== type));
    } else {
      setFileType([...current, type]);
    }
  };

  return (
    <div className="w-full p-5 rounded-2xl bg-glass-medium border border-border-color shadow-xl backdrop-blur-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

      {/* File Type */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs font-bold text-text-secondary uppercase tracking-widest">
          File Type
          {(filters.fileType?.length ?? 0) > 0 && (
            <button onClick={() => setFileType(undefined)} className="text-[10px] hover:text-red-400 transition-colors cursor-pointer">Clear</button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILE_TYPE_OPTIONS.map(({ value, label, icon }) => {
            const isActive = (filters.fileType ?? []).includes(value);
            return (
              <motion.button
                key={value}
                onClick={() => toggleType(value)}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary border border-primary text-background'
                    : 'bg-background/40 border border-border-color text-text-secondary hover:text-text-primary hover:border-primary/50'
                }`}
              >
                <span>{icon}</span> {label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* File Size */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs font-bold text-text-secondary uppercase tracking-widest">
          File Size
          {filters.sizeRange && (
            <button onClick={() => setSizeRange(undefined)} className="text-[10px] hover:text-red-400 transition-colors cursor-pointer">Clear</button>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {SIZE_OPTIONS.map(({ value, label }) => {
            const isActive = filters.sizeRange === value;
            return (
              <button
                key={value}
                onClick={() => setSizeRange(isActive ? undefined : value)}
                className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-background/20 text-text-secondary border border-transparent hover:bg-background/40 hover:text-text-primary'
                }`}
              >
                {label}
                {isActive && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modified Date */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs font-bold text-text-secondary uppercase tracking-widest">
          Modified Date
          {filters.dateRange && (
            <button onClick={() => setDateRange(undefined)} className="text-[10px] hover:text-red-400 transition-colors cursor-pointer">Clear</button>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {DATE_OPTIONS.map(({ value, label }) => {
            const isActive = filters.dateRange === value;
            return (
              <button
                key={value}
                onClick={() => setDateRange(isActive ? undefined : value)}
                className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-background/20 text-text-secondary border border-transparent hover:bg-background/40 hover:text-text-primary'
                }`}
              >
                {label}
                {isActive && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Owner */}
      {availableOwners.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 text-xs font-bold text-text-secondary uppercase tracking-widest">
            Owner
            {(filters.owner?.length ?? 0) > 0 && (
              <button onClick={() => setOwner(undefined)} className="text-[10px] hover:text-red-400 transition-colors cursor-pointer">Clear</button>
            )}
          </div>
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 stylish-scrollbar">
            {availableOwners.map(owner => {
              const isActive = (filters.owner ?? []).includes(owner);
              return (
                <button
                  key={owner}
                  onClick={() => {
                    const current = filters.owner ?? [];
                    setOwner(
                      current.includes(owner)
                        ? current.filter(o => o !== owner)
                        : [...current, owner]
                    );
                  }}
                  className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 overflow-hidden cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'bg-background/20 text-text-secondary border border-transparent hover:bg-background/40 hover:text-text-primary'
                  }`}
                >
                  <span className="truncate pr-2">{owner}</span>
                  {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
