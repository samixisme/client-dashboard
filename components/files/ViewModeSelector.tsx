import React from 'react';
import {
  List,
  LayoutGrid,
  Columns,
  Image,
  Clock,
} from 'lucide-react';
import { DriveViewMode } from '../../types/drive';

interface ViewModeSelectorProps {
  currentMode: DriveViewMode;
  onChange: (mode: DriveViewMode) => void;
}

const VIEW_MODES: {
  mode: DriveViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { mode: 'list',     label: 'List',     icon: List },
  { mode: 'grid',     label: 'Grid',     icon: LayoutGrid },
  { mode: 'kanban',   label: 'Kanban',   icon: Columns },
  { mode: 'gallery',  label: 'Gallery',  icon: Image },
  { mode: 'timeline', label: 'Timeline', icon: Clock },
];

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ currentMode, onChange }) => {
  return (
    <div
      className="flex items-center bg-glass/60 backdrop-blur-xl border border-border-color rounded-lg p-0.5"
      role="group"
      aria-label="View mode"
    >
      {VIEW_MODES.map(({ mode, label, icon: Icon }) => {
        const isActive = currentMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            title={`${label} view`}
            aria-pressed={isActive}
            className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
              isActive
                ? 'bg-primary text-background shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-glass-light'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
};

export default ViewModeSelector;
