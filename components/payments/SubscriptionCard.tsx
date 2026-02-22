import React, { useState } from 'react';
import { Subscription, Client } from '../../types';
import { toast } from 'sonner';

interface SubscriptionCardProps {
  subscription: Subscription;
  client: Client | undefined;
  onStatusChange: (id: string, action: 'cancel' | 'suspend' | 'unsuspend') => Promise<void>;
  onMarkPaid: (subscriptionId: string) => void;
  animationDelay?: number;
}

const BILLING_CYCLE_LABEL: Record<Subscription['billingCycle'], string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const STATUS_CONFIG: Record<Subscription['status'], {
  dot: string;
  glow: string;
  badge: string;
  label: string;
}> = {
  active:    { dot: 'bg-green-400',  glow: 'shadow-[0_0_8px_rgba(74,222,128,0.7)]',  badge: 'text-green-400 bg-green-400/10 border-green-400/30',  label: 'Active'    },
  pending:   { dot: 'bg-yellow-400', glow: 'shadow-[0_0_8px_rgba(250,204,21,0.7)]',  badge: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', label: 'Pending'   },
  suspended: { dot: 'bg-orange-400', glow: 'shadow-[0_0_8px_rgba(251,146,60,0.7)]',  badge: 'text-orange-400 bg-orange-400/10 border-orange-400/30', label: 'Suspended' },
  cancelled: { dot: 'bg-red-400',    glow: 'shadow-[0_0_8px_rgba(248,113,113,0.7)]', badge: 'text-red-400 bg-red-400/10 border-red-400/30',          label: 'Cancelled' },
};

function getDueDateInfo(nextDueDate: string): { label: string; colorClass: string } {
  const due = new Date(nextDueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)  return { label: `${Math.abs(diffDays)}d overdue`,  colorClass: 'text-red-400' };
  if (diffDays === 0) return { label: 'Due today',                        colorClass: 'text-red-400' };
  if (diffDays <= 7)  return { label: `Due in ${diffDays}d`,              colorClass: 'text-yellow-400' };
  return {
    label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    colorClass: 'text-text-secondary',
  };
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  client,
  onStatusChange,
  onMarkPaid,
  animationDelay = 0,
}) => {
  const [isActioning, setIsActioning] = useState(false);
  const statusCfg = STATUS_CONFIG[subscription.status];
  const dueDateInfo = getDueDateInfo(subscription.nextDueDate);

  const handleAction = async (action: 'cancel' | 'suspend' | 'unsuspend') => {
    try {
      setIsActioning(true);
      await onStatusChange(subscription.id, action);
    } catch {
      toast.error(`Failed to ${action} subscription`);
    } finally {
      setIsActioning(false);
    }
  };

  return (
    <div
      className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-5 hover:bg-glass/60 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl animate-fade-in-up"
      style={{ animationDelay: `${animationDelay}ms`, opacity: 0 }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Recurring icon */}
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.091 1.21-.138 2.43-.138 3.662m14.324 0c0 1.232-.046 2.453-.138 3.662a4.006 4.006 0 01-3.7 3.7 48.678 48.678 0 01-7.324 0 4.006 4.006 0 01-3.7-3.7c-.091-1.21-.138-2.43-.138-3.662m14.324 0l-2.06-2.06m0 0l-2.06 2.06" />
            </svg>
            <h3 className="font-semibold text-text-primary text-sm truncate">{subscription.planName}</h3>
          </div>
          <p className="text-xs text-text-secondary truncate">{client?.name ?? `Client #${subscription.paymenterClientId}`}</p>
        </div>

        {/* Status badge */}
        <span className={`flex-shrink-0 ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusCfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${statusCfg.glow}`} />
          {statusCfg.label}
        </span>
      </div>

      {/* Price + cycle */}
      <div className="flex items-end gap-1 mb-4">
        <span className="text-2xl font-bold text-text-primary">
          {subscription.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-sm font-semibold text-primary mb-0.5">MAD</span>
        <span className="text-xs text-text-secondary mb-0.5 ml-1">/ {BILLING_CYCLE_LABEL[subscription.billingCycle].toLowerCase()}</span>
      </div>

      {/* Next due date */}
      <div className="flex items-center gap-2 mb-5 text-xs">
        <svg className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={`font-medium ${dueDateInfo.colorClass}`}>Next due: {dueDateInfo.label}</span>
      </div>

      {/* Notes */}
      {subscription.notes && (
        <p className="text-xs text-text-secondary mb-4 italic border-l-2 border-border-color pl-2 truncate">
          {subscription.notes}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mark Paid — always available for active/pending */}
        {(subscription.status === 'active' || subscription.status === 'pending') && (
          <button
            onClick={() => onMarkPaid(subscription.id)}
            disabled={isActioning}
            className="flex-1 min-w-0 px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold hover:bg-primary hover:text-background transition-all duration-200 disabled:opacity-50 truncate"
          >
            Mark Paid
          </button>
        )}

        {/* Suspend / Unsuspend */}
        {subscription.status === 'active' && (
          <button
            onClick={() => handleAction('suspend')}
            disabled={isActioning}
            className="px-3 py-1.5 bg-glass/40 text-orange-400 border border-orange-400/30 rounded-lg text-xs font-semibold hover:bg-orange-400/10 transition-all duration-200 disabled:opacity-50"
          >
            Suspend
          </button>
        )}
        {subscription.status === 'suspended' && (
          <button
            onClick={() => handleAction('unsuspend')}
            disabled={isActioning}
            className="flex-1 px-3 py-1.5 bg-glass/40 text-green-400 border border-green-400/30 rounded-lg text-xs font-semibold hover:bg-green-400/10 transition-all duration-200 disabled:opacity-50"
          >
            Reactivate
          </button>
        )}

        {/* Cancel — available unless already cancelled */}
        {subscription.status !== 'cancelled' && (
          <button
            onClick={() => handleAction('cancel')}
            disabled={isActioning}
            className="px-3 py-1.5 bg-glass/40 text-red-400 border border-red-400/30 rounded-lg text-xs font-semibold hover:bg-red-400/10 transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
