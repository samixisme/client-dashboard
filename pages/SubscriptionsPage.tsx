import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { useAdmin } from '../contexts/AdminContext';
import { Subscription, BillingRecord } from '../types';
import { SubscriptionCard } from '../components/payments/SubscriptionCard';
import { AddSubscriptionModal } from '../components/payments/AddSubscriptionModal';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function safeJson(res: globalThis.Response): Promise<any> {
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new Error(`Expected JSON but got ${ct || 'unknown content-type'} (status ${res.status})`);
  }
  return res.json();
}

function mapPaymenterService(svc: Record<string, unknown>): Subscription {
  const cycleMap: Record<string, Subscription['billingCycle']> = {
    monthly: 'monthly',
    quarterly: 'quarterly',
    annually: 'yearly',
    yearly: 'yearly',
  };
  const statusMap: Record<string, Subscription['status']> = {
    active: 'active',
    suspended: 'suspended',
    cancelled: 'cancelled',
    pending: 'pending',
  };

  return {
    id: String(svc.id),
    clientId: '',
    paymenterClientId: Number(svc.user_id ?? 0),
    planName: String((svc.product as Record<string, unknown>)?.name ?? svc.name ?? 'Hosting Service'),
    price: Number(svc.price ?? 0),
    billingCycle: cycleMap[String(svc.billing_cycle ?? 'monthly')] ?? 'monthly',
    status: statusMap[String(svc.status ?? 'active')] ?? 'active',
    nextDueDate: String(svc.due_date ?? new Date().toISOString()),
    createdAt: String(svc.created_at ?? new Date().toISOString()),
    notes: String(svc.notes ?? ''),
  };
}

function mapPaymenterInvoice(inv: Record<string, unknown>): BillingRecord {
  const statusMap: Record<string, BillingRecord['status']> = {
    paid: 'paid',
    unpaid: 'unpaid',
    overdue: 'overdue',
    pending: 'unpaid',
  };

  return {
    id: String(inv.id),
    subscriptionId: String(inv.service_id ?? ''),
    clientId: String(inv.user_id ?? ''),
    amount: Number(inv.amount ?? 0),
    currency: 'MAD',
    status: statusMap[String(inv.status ?? 'unpaid')] ?? 'unpaid',
    dueDate: String(inv.due_date ?? new Date().toISOString()),
    paidAt: inv.paid_at ? String(inv.paid_at) : undefined,
    paymentMethod: 'bank_transfer',
    reference: String(inv.reference ?? ''),
  };
}

// ─── Paymenter status banner ──────────────────────────────────────────────────

const PaymenterStatusBanner: React.FC<{ status: 'checking' | 'ok' | 'error' | 'unconfigured' }> = ({ status }) => {
  if (status === 'ok' || status === 'checking') return null;

  return (
    <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
      status === 'unconfigured'
        ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
        : 'bg-red-400/10 border-red-400/30 text-red-400'
    }`}>
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <p className="font-semibold text-sm">
          {status === 'unconfigured' ? 'Paymenter not configured' : 'Cannot reach Paymenter'}
        </p>
        <p className="text-xs mt-0.5 opacity-80">
          {status === 'unconfigured'
            ? 'Add PAYMENTER_URL and PAYMENTER_API_KEY to your .env, then restart the API server.'
            : 'Make sure Paymenter is running: npm run paymenter:start'}
        </p>
        <code className="block mt-2 text-xs bg-black/20 rounded px-2 py-1 font-mono">
          npm run paymenter:start
        </code>
      </div>
    </div>
  );
};

// ─── Mark Paid modal ──────────────────────────────────────────────────────────

const MarkPaidModal: React.FC<{
  subscriptionId: string;
  onClose: () => void;
  onConfirm: (reference: string) => Promise<void>;
}> = ({ onClose, onConfirm }) => {
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm(reference);
      onClose();
    } catch {
      toast.error('Failed to mark as paid');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-border-color p-6 shadow-2xl animate-scale-in" style={{ background: 'rgba(18,18,18,0.95)' }}>
        <h3 className="text-base font-bold text-text-primary mb-2">Mark Invoice as Paid</h3>
        <p className="text-sm text-text-secondary mb-4">Enter the bank transfer reference (optional).</p>
        <input
          type="text"
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder="Transfer reference / RIB…"
          className="w-full px-3 py-2.5 bg-glass/40 border border-border-color rounded-xl text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-glass/40 border border-border-color text-text-secondary rounded-xl text-sm font-semibold hover:text-text-primary transition-all">Cancel</button>
          <button onClick={handleConfirm} disabled={isSubmitting} className="flex-1 px-4 py-2 bg-primary text-background rounded-xl text-sm font-bold hover:bg-primary-hover transition-all disabled:opacity-50">
            {isSubmitting ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const SubscriptionsPage: React.FC = () => {
  const { data } = useData();
  const { clients } = data;

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'billing'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [paymenterStatus, setPaymenterStatus] = useState<'checking' | 'ok' | 'error' | 'unconfigured'>('checking');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [markPaidInfo, setMarkPaidInfo] = useState<{ subscriptionId: string; invoiceId?: string } | null>(null);

  // ── Check connectivity ───────────────────────────────────────────────────

  const checkStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/paymenter/status');
      const data = await safeJson(res);
      if (data.success) {
        setPaymenterStatus('ok');
        return true;
      } else if (!data.configured) {
        setPaymenterStatus('unconfigured');
      } else {
        setPaymenterStatus('error');
      }
    } catch {
      setPaymenterStatus('error');
    }
    return false;
  }, []);

  // ── Load data ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subRes, invRes] = await Promise.all([
        fetch('/api/paymenter/subscriptions'),
        fetch('/api/paymenter/invoices'),
      ]);
      const [subJson, invJson] = await Promise.all([safeJson(subRes), safeJson(invRes)]);

      if (subJson.success) {
        const raw = Array.isArray(subJson.data?.data) ? subJson.data.data : (Array.isArray(subJson.data) ? subJson.data : []);
        setSubscriptions(raw.map((s: Record<string, unknown>) => mapPaymenterService(s)));
      }
      if (invJson.success) {
        const raw = Array.isArray(invJson.data?.data) ? invJson.data.data : (Array.isArray(invJson.data) ? invJson.data : []);
        setBillingRecords(raw.map((i: Record<string, unknown>) => mapPaymenterInvoice(i)));
      }
    } catch {
      // Data load failure is non-critical — user still sees status banner
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus().then((ok) => {
      if (ok) loadData();
      else setIsLoading(false);
    });
  }, [checkStatus, loadData]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleStatusChange = async (id: string, action: 'cancel' | 'suspend' | 'unsuspend') => {
    const res = await fetch(`/api/paymenter/subscriptions/${id}/${action}`, { method: 'PUT' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? `Failed to ${action}`);
    toast.success(`Subscription ${action === 'unsuspend' ? 'reactivated' : action + 'led'}`);
    await loadData();
  };

  const handleMarkPaid = (subscriptionId: string) => {
    setMarkPaidInfo({ subscriptionId });
  };

  const handleMarkPaidConfirm = async (reference: string) => {
    if (!markPaidInfo) return;
    // Find the latest unpaid invoice for this subscription
    const unpaidInvoice = billingRecords.find(
      b => b.subscriptionId === markPaidInfo.subscriptionId && b.status !== 'paid'
    );
    if (!unpaidInvoice) {
      toast.error('No unpaid invoice found for this subscription');
      return;
    }
    const res = await fetch(`/api/paymenter/invoices/${unpaidInvoice.id}/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? 'Failed to mark paid');
    toast.success('Invoice marked as paid');
    await loadData();
  };

  // ── Stats ────────────────────────────────────────────────────────────────

  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const overdueInvoices = billingRecords.filter(b => b.status === 'overdue').length;
  const totalMrr = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => {
      const monthly = s.billingCycle === 'yearly' ? s.price / 12 : s.billingCycle === 'quarterly' ? s.price / 3 : s.price;
      return sum + monthly;
    }, 0);

  // ── Status badge for billing records ─────────────────────────────────────

  const billingStatusConfig: Record<BillingRecord['status'], { color: string; dot: string; label: string }> = {
    paid:    { color: 'text-green-400',  dot: 'bg-green-400',  label: 'Paid'    },
    unpaid:  { color: 'text-blue-400',   dot: 'bg-blue-400',   label: 'Pending' },
    overdue: { color: 'text-red-400',    dot: 'bg-red-400',    label: 'Overdue' },
  };

  return (
    <div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) forwards; }
        .animate-fade-in    { animation: fadeIn 0.35s ease-out forwards; }
        .animate-scale-in   { animation: scaleIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-start mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Subscriptions</h1>
          <p className="text-text-secondary">Manage hosting subscriptions and billing cycles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={paymenterStatus !== 'ok'}
          className="p-3 bg-primary text-gray-900 rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          title={paymenterStatus !== 'ok' ? 'Paymenter not connected' : 'Add subscription'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Paymenter status banner */}
      <PaymenterStatusBanner status={paymenterStatus} />

      {/* Stats row */}
      {paymenterStatus === 'ok' && (
        <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          {[
            { label: 'Active Subscriptions', value: activeCount, color: 'text-green-400' },
            { label: 'Est. MRR', value: `${totalMrr.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} MAD`, color: 'text-primary' },
            { label: 'Overdue Invoices', value: overdueInvoices, color: overdueInvoices > 0 ? 'text-red-400' : 'text-text-secondary' },
          ].map(stat => (
            <div key={stat.label} className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl px-5 py-4">
              <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{isLoading ? '—' : stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab switcher */}
      <div className="relative inline-flex items-center gap-2 mb-6 bg-glass/60 backdrop-blur-xl rounded-xl p-1.5 border border-border-color shadow-md animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div
          className="absolute top-1.5 bottom-1.5 bg-primary rounded-lg shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] transition-all duration-300 ease-out"
          style={{
            left: activeTab === 'subscriptions' ? '6px' : 'calc(50% + 3px)',
            width: 'calc(50% - 9px)',
          }}
        />
        {(['subscriptions', 'billing'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 z-10 capitalize ${
              activeTab === tab ? 'text-background scale-105' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'subscriptions' ? 'Subscriptions' : 'Billing History'}
            {tab === 'billing' && overdueInvoices > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-400/20 text-red-400">{overdueInvoices}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Subscriptions tab ── */}
      {activeTab === 'subscriptions' && (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-glass/20 border border-border-color rounded-2xl h-52 animate-pulse" />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-glass-light/60 backdrop-blur-sm mb-4 border border-border-color/50">
                <svg className="w-10 h-10 text-text-secondary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.091 1.21-.138 2.43-.138 3.662m14.324 0c0 1.232-.046 2.453-.138 3.662a4.006 4.006 0 01-3.7 3.7 48.678 48.678 0 01-7.324 0 4.006 4.006 0 01-3.7-3.7c-.091-1.21-.138-2.43-.138-3.662" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">No subscriptions yet</h3>
              <p className="text-text-secondary mb-6">Create your first hosting subscription to get started</p>
              <button
                onClick={() => setShowAddModal(true)}
                disabled={paymenterStatus !== 'ok'}
                className="inline-flex px-6 py-3 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover transition-all duration-300 shadow-lg disabled:opacity-40"
              >
                Add Subscription
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map((sub, i) => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  client={clients.find(c => String(c.id) === String(sub.paymenterClientId))}
                  onStatusChange={handleStatusChange}
                  onMarkPaid={handleMarkPaid}
                  animationDelay={i * 50}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Billing history tab ── */}
      {activeTab === 'billing' && (
        <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl overflow-hidden shadow-xl animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-color">
              <thead className="bg-glass-light/50 backdrop-blur-sm">
                <tr>
                  {['Invoice ID', 'Client', 'Amount', 'Due Date', 'Status', 'Reference', 'Actions'].map(h => (
                    <th key={h} scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-text-secondary text-sm">
                      Loading billing records…
                    </td>
                  </tr>
                ) : billingRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <p className="text-text-secondary text-sm">No billing records found</p>
                    </td>
                  </tr>
                ) : (
                  billingRecords.map((record, i) => {
                    const scfg = billingStatusConfig[record.status];
                    const client = clients.find(c => c.id === record.clientId);
                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-glass/60 transition-all duration-200 animate-fade-in-up"
                        style={{ animationDelay: `${i * 25}ms` }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-primary">#{record.id}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                          {client?.name ?? `Client #${record.clientId}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-text-primary">
                            {record.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-primary font-semibold">MAD</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {new Date(record.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${scfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${scfg.dot}`} />
                            {scfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {record.reference || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {record.status !== 'paid' && (
                            <button
                              onClick={() => setMarkPaidInfo({ subscriptionId: record.subscriptionId, invoiceId: record.id })}
                              className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary hover:text-background transition-all duration-200"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddSubscriptionModal
          clients={clients}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadData}
        />
      )}
      {markPaidInfo && (
        <MarkPaidModal
          subscriptionId={markPaidInfo.subscriptionId}
          onClose={() => setMarkPaidInfo(null)}
          onConfirm={handleMarkPaidConfirm}
        />
      )}
    </div>
  );
};

export default SubscriptionsPage;
