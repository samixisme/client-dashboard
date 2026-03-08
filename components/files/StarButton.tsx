import React from 'react';
import { useFileStars } from '../../hooks/useFileStars';

interface StarButtonProps {
  fileId: string;
  className?: string;
}

/**
 * DES-84 — Star/Favorite toggle button for file cards.
 * Renders a star icon that fills yellow when a file is starred.
 * Click stops propagation to avoid opening the metadata sidebar.
 */
const StarButton: React.FC<StarButtonProps> = ({ fileId, className = '' }) => {
  const { isStarred, toggleStar } = useFileStars();
  const starred = isStarred(fileId);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggleStar(fileId); }}
      aria-label={starred ? 'Remove from favorites' : 'Add to favorites'}
      title={starred ? 'Remove from favorites' : 'Add to favorites'}
      className={`p-1 rounded-lg transition-all ${
        starred
          ? 'text-yellow-400 hover:text-yellow-300'
          : 'text-text-secondary hover:text-yellow-400 opacity-0 group-hover:opacity-100 focus:opacity-100'
      } ${className}`}
    >
      <svg
        className="w-4 h-4"
        fill={starred ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    </button>
  );
};

export default StarButton;
