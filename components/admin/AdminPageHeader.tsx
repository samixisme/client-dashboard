import React, { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  /** Slot for primary action button(s) — rendered right-aligned */
  actions?: ReactNode;
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {actions}
        </div>
      )}
    </div>
  );
}
