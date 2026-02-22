import React from 'react';

interface FileBreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const FileBreadcrumb: React.FC<FileBreadcrumbProps> = ({ currentPath, onNavigate }) => {
  const parts = currentPath.split('/').filter(Boolean);

  return (
    <nav aria-label="File path breadcrumb" className="flex items-center gap-1 text-sm text-text-secondary overflow-x-auto no-scrollbar">
      <button
        onClick={() => onNavigate('')}
        className="hover:text-text-primary transition-colors whitespace-nowrap flex items-center gap-1"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        All Files
      </button>

      {parts.map((part, index) => {
        const path = parts.slice(0, index + 1).join('/');
        const isLast = index === parts.length - 1;
        return (
          <React.Fragment key={path}>
            <span className="text-border-color flex-shrink-0">/</span>
            {isLast ? (
              <span
                aria-current="page"
                className="whitespace-nowrap text-text-primary font-medium"
              >
                {part}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(path)}
                className="whitespace-nowrap transition-colors hover:text-text-primary cursor-pointer"
              >
                {part}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default FileBreadcrumb;
