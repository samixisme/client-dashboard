import React from 'react';

// Standard props for consistency
interface IconProps {
    className?: string;
    strokeWidth?: number;
}

const DefaultIcon: React.FC<IconProps & { children: React.ReactNode }> = ({ className, strokeWidth = 1.5, children }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        {children}
    </svg>
);

// --- Creation Tools ---

export const TextIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </DefaultIcon>
);

export const ImageIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </DefaultIcon>
);

export const LinkIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </DefaultIcon>
);

export const ColumnIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M12 3v18" />
        <rect x="3" y="3" width="18" height="18" rx="2" />
    </DefaultIcon>
);

export const ConnectorIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M8.5 8.5l7 7" />
    </DefaultIcon>
);

// --- Actions ---



export const UndoIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M3 7v6h6" />
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </DefaultIcon>
);

export const RedoIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </DefaultIcon>
);

// --- Navigation & View ---

export const ZoomInIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
    </DefaultIcon>
);

export const ZoomOutIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="8" y1="11" x2="14" y2="11" />
    </DefaultIcon>
);

export const MoveIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3-3" />
        <path d="M2 12h20M12 2v20" />
    </DefaultIcon>
);

export const PanIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        <path d="M3 12h2M19 12h2M12 3v2M12 19v2" />
    </DefaultIcon>
);

export const FullscreenIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </DefaultIcon>
);

export const ExitFullscreenIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </DefaultIcon>
);

export const GridIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </DefaultIcon>
);

export const KanbanViewIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5z" />
    </DefaultIcon>
);

export const ListIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </DefaultIcon>
);

// Cloud Save
export const SaveIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </DefaultIcon>
);

// Fit to Screen (Recenter)
export const CenterFocusIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M15 3h6v6" />
        <path d="M9 21H3v-6" />
        <path d="M21 3l-7 7" />
        <path d="M3 21l7-7" />
    </DefaultIcon>
);

// --- Resources ---

export const BoardIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <line x1="9" y1="4" x2="9" y2="20" />
    </DefaultIcon>
);

export const TaskIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
         <path d="M9 11l3 3L22 4" />
         <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </DefaultIcon>
);

export const RoadmapIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z" />
        <path d="M6 13v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </DefaultIcon>
);

export const CommentIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </DefaultIcon>
);

export const SidebarIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
    </DefaultIcon>
);

export const CloseIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </DefaultIcon>
);

export const TrashIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </DefaultIcon>
);

export const EditIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </DefaultIcon>
);

export const ColorPaletteIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
    </DefaultIcon>
);

export const DownloadIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </DefaultIcon>
);

export const ChevronLeftIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <polyline points="15 18 9 12 15 6" />
    </DefaultIcon>
);
