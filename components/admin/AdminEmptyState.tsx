import React, { ReactNode } from 'react';

interface AdminEmptyStateProps {
  /** Lucide icon at 48px, e.g. <Users className="h-12 w-12" /> */
  icon: ReactNode;
  title: string;
  description?: string;
  /** Optional CTA button */
  action?: ReactNode;
}

export function AdminEmptyState({ icon, title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-text-secondary opacity-30 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
