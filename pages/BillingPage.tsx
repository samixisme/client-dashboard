import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';
import { useAdmin } from '../contexts/AdminContext';
import { useData } from '../contexts/DataContext';
import AdminPanel from '../components/admin/AdminPanel';
import { DocumentDownloadButton } from '../src/components/payments/DocumentDownloadButton';
import { SubscriptionCard } from '../components/payments/SubscriptionCard';
import { AddSubscriptionModal } from '../components/payments/AddSubscriptionModal';
import { toast } from 'sonner';
import { Invoice, Estimate, Client, UserSettings, Subscription, BillingRecord } from '../types';
import { updateInvoiceStatus, updateEstimateStatus, convertEstimateToInvoice, deleteInvoice, deleteEstimate } from '../utils/invoiceService';
import { useNovuTrigger } from '../src/hooks/useNovuTrigger';

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingTab = 'invoices' | 'estimates' | 'subscriptions' | 'billing';

const DEFAULT_USER_SETTINGS: UserSettings = {
  userId: '',
  ae: '', cnie: '', ice: '', if: '', tp: '', adresse_ae: '',
  bankDetails: { codeBanque: '', codeVille: '', nDeCompte: '', cleRib: '', codeSwift: '' },
  footerDetails: { adresseMail: '', telephone: '', site: '' },
  legalNote: '', signatureBoxClient: '', signatureBoxAutoEntrepreneur: '',
};

// ─── Helpers (Paymenter) ──────────────────────────────────────────────────────

async function safeJson(res: globalThis.Response): Promise<any> {
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new Error(`Expected JSON but got ${ct || 'unknown'} (status ${res.status})`);
  }
  return res.json();
}

function mapPaymenterService(svc: Record<string, unknown>): Subscription {
  const cycleMap: Record<string, Subscription['billingCycle']> = {
    monthly: 'monthly', quarterly: 'quarterly', annually: 'yearly', yearly: 'yearly',
  };
  const statusMap: Record<string, Subscription['status']> = {
    active: 'active', suspended: 'suspended', cancelled: 'cancelled', pending: 'pending',
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
    paid: 'paid', unpaid: 'unpaid', overdue: 'overdue', pending: 'unpaid',
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

// ─── Sub-components ───────────────────────────────────────────────────────────

const PageStyles: React.FC = () => (
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
    @keyframes shimmer {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }
    .animate-fade-in-up  { animation: fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) forwards; opacity: 0; }
    .animate-fade-in     { animation: fadeIn 0.35s ease-out forwards; }
    .animate-scale-in    { animation: scaleIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
    .animate-shimmer     { animation: shimmer 2s infinite; }
    /* Fira Code for monospace data values (ui-ux-pro-max recommendation) */
    .font-mono-data { font-family: 'Fira Code', 'Courier New', monospace; }
  `}</style>
);

const StatusSelect: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const cfg = {
    Draft:   { dot: 'bg-gray-400',  glow: 'shadow-[0_0_8px_rgba(156,163,175,0.6)]' },
    Sent:    { dot: 'bg-blue-400',  glow: 'shadow-[0_0_8px_rgba(96,165,250,0.6)]'  },
    Paid:    { dot: 'bg-green-400', glow: 'shadow-[0_0_8px_rgba(74,222,128,0.6)]'  },
    Overdue: { dot: 'bg-red-400',   glow: 'shadow-[0_0_8px_rgba(248,113,113,0.6)]' },
  } as const;
  const statuses = ['Draft', 'Sent', 'Paid', 'Overdue'] as const;
  const c = cfg[value as keyof typeof cfg] ?? cfg.Draft;

  const open = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setIsOpen(v => !v);
  };

  return (
    <div className="relative inline-block">
      <button type="button" ref={btnRef} onClick={open}
        className="inline-flex items-center gap-2 bg-glass/40 backdrop-blur-xl border border-border-color/50 rounded-lg px-3 py-1.5 hover:bg-glass/60 transition-all duration-300 shadow-sm cursor-pointer">
        <div className={`w-2 h-2 rounded-full ${c.dot} ${c.glow}`} />
        <span className="text-xs font-semibold text-text-primary">{value}</span>
        <svg className={`w-3 h-3 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={e => { e.stopPropagation(); setIsOpen(false); }} />
          <div className="fixed z-[9999] min-w-[120px] rounded-xl overflow-hidden duration-150"
            style={{ top: pos.top, left: pos.left, background: 'rgba(18,18,18,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(163,230,53,0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            <div className="p-1">
              {statuses.map(s => {
                const sc = cfg[s]; const sel = s === value;
                return (
                  <button key={s} type="button"
                    onClick={e => { e.stopPropagation(); onChange(s); setIsOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all duration-200 cursor-pointer ${sel ? 'bg-primary/15' : 'hover:bg-white/5'}`}>
                    <div className={`w-2 h-2 rounded-full ${sc.dot} ${sc.glow}`} />
                    <span className={`text-xs font-medium ${sel ? 'text-primary' : 'text-text-primary'}`}>{s}</span>
                    {sel && <svg className="w-3 h-3 text-primary ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                );
              })}
            </div>
          </div>
        </>, document.body
      )}
    </div>
  );
};

const PaymenterBanner: React.FC<{ status: 'checking' | 'ok' | 'error' | 'unconfigured' }> = ({ status }) => {
  if (status === 'ok' || status === 'checking') return null;
  const isUncfg = status === 'unconfigured';
  return (
    <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${isUncfg ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' : 'bg-red-400/10 border-red-400/30 text-red-400'}`}>
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <p className="font-semibold text-sm">{isUncfg ? 'Paymenter not configured' : 'Cannot reach Paymenter'}</p>
        <p className="text-xs mt-0.5 opacity-80">{isUncfg ? 'Add PAYMENTER_URL and PAYMENTER_API_KEY to your .env, then restart.' : 'Make sure Paymenter is running.'}</p>
        <code className="block mt-2 text-xs bg-black/20 rounded px-2 py-1 font-mono">npm run paymenter:start</code>
      </div>
    </div>
  );
};

const MarkPaidModal: React.FC<{ subscriptionId: string; onClose: () => void; onConfirm: (ref: string) => Promise<void> }> = ({ onClose, onConfirm }) => {
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const confirm = async () => { setBusy(true); try { await onConfirm(ref); onClose(); } catch { toast.error('Failed to mark as paid'); } finally { setBusy(false); } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-border-color p-6 shadow-2xl animate-scale-in" style={{ background: 'rgba(18,18,18,0.95)' }}>
        <h3 className="text-base font-bold text-text-primary mb-2">Mark Invoice as Paid</h3>
        <p className="text-sm text-text-secondary mb-4">Enter the bank transfer reference (optional).</p>
        <input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="Transfer reference / RIB…"
          className="w-full px-3 py-2.5 bg-glass/40 border border-border-color rounded-xl text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-glass/40 border border-border-color text-text-secondary rounded-xl text-sm font-semibold hover:text-text-primary transition-all cursor-pointer">Cancel</button>
          <button onClick={confirm} disabled={busy} className="flex-1 px-4 py-2 bg-primary text-background rounded-xl text-sm font-bold hover:bg-primary-hover transition-all disabled:opacity-50 cursor-pointer">
            {busy ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Stats bar ────────────────────────────────────────────────────────────────

interface StatsBarProps {
  invoices: Invoice[];
  subscriptions: Subscription[];
  billingRecords: BillingRecord[];
  paymenterOk: boolean;
  isLoading: boolean;
}
const StatsBar: React.FC<StatsBarProps> = ({ invoices, subscriptions, billingRecords, paymenterOk, isLoading }) => {
  const totalInvoiced = invoices.reduce((s, i) => s + (i.totals?.totalNet ?? 0), 0);
  let activeCount = 0;
  let mrr = 0;
  subscriptions.forEach(s => {
    if (s.status === 'active') {
      activeCount++;
      const m = s.billingCycle === 'yearly' ? s.price / 12 : s.billingCycle === 'quarterly' ? s.price / 3 : s.price;
      mrr += m;
    }
  });
  const overdueInv  = invoices.filter(i => i.status === 'Overdue').length;
  const overdueRec  = billingRecords.filter(b => b.status === 'overdue').length;
  const overdueTotal = overdueInv + overdueRec;

  const stats = [
    { label: 'Total Invoiced', value: totalInvoiced.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }), color: 'text-primary', mono: true },
    { label: 'Active Subscriptions', value: paymenterOk ? String(activeCount) : '—', color: 'text-green-400', mono: false },
    { label: 'Est. MRR', value: paymenterOk ? `${mrr.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} MAD` : '—', color: 'text-primary', mono: true },
    { label: 'Overdue', value: String(overdueTotal), color: overdueTotal > 0 ? 'text-red-400' : 'text-text-secondary', mono: false },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
      {stats.map(s => (
        <div key={s.label} className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl px-5 py-4">
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">{s.label}</p>
          <p className={`text-2xl font-bold ${s.color} ${s.mono ? 'font-mono-data' : ''}`}>
            {isLoading ? '—' : s.value}
          </p>
        </div>
      ))}
    </div>
  );
};

// ─── Tab Switcher ─────────────────────────────────────────────────────────────

const TABS: { id: BillingTab; label: string }[] = [
  { id: 'invoices',      label: 'Invoices'       },
  { id: 'estimates',     label: 'Estimates'      },
  { id: 'subscriptions', label: 'Subscriptions'  },
  { id: 'billing',       label: 'Billing History'},
];

const TabSwitcher: React.FC<{
  active: BillingTab;
  onChange: (t: BillingTab) => void;
  counts: Record<BillingTab, number | null>;
}> = ({ active, onChange, counts }) => {
  const idx = TABS.findIndex(t => t.id === active);
  const w = `calc(${100 / TABS.length}% - 6px)`;
  const l = `calc(${(idx / TABS.length) * 100}% + 6px)`;
  return (
    <div className="relative inline-flex items-center gap-1 mb-6 bg-glass/60 backdrop-blur-xl rounded-xl p-1.5 border border-border-color shadow-md animate-fade-in-up w-full max-w-xl" style={{ animationDelay: '100ms' }}>
      <div className="absolute top-1.5 bottom-1.5 bg-primary rounded-lg shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] transition-all duration-300 ease-out" style={{ left: l, width: w }} />
      {TABS.map(tab => {
        const sel = active === tab.id;
        const count = counts[tab.id];
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)}
            className={`relative flex-1 px-3 py-2.5 text-xs font-semibold rounded-lg transition-all duration-300 z-10 whitespace-nowrap ${sel ? 'text-background scale-105' : 'text-text-secondary hover:text-text-primary'}`}>
            {tab.label}
            {count != null && count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold backdrop-blur-sm transition-all duration-300 ${sel ? 'bg-background/20 shadow-lg' : 'bg-glass-light/60'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const BillingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdminMode } = useAdmin();
  const { data } = useData();
  const { invoices: allInvoices, estimates: allEstimates, clients, brands, userSettings: userSettingsList } = data;
  const userSettings = userSettingsList[0] ?? DEFAULT_USER_SETTINGS;
  const { trigger: novuTrigger } = useNovuTrigger();
  const hasSyncedRef = useRef(false);
  const { searchQuery } = useSearch();

  const tabFromUrl = searchParams.get('tab') as BillingTab | null;
  const validTabs: BillingTab[] = ['invoices', 'estimates', 'subscriptions', 'billing'];
  const [activeTab, setActiveTab] = useState<BillingTab>(validTabs.includes(tabFromUrl as BillingTab) ? (tabFromUrl as BillingTab) : 'invoices');

  const brandId = searchParams.get('brandId');
  const brand   = brandId ? brands.find(b => b.id === brandId) : null;

  // Paymenter state
  const [subscriptions, setSubscriptions]   = useState<Subscription[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [paymenterStatus, setPaymenterStatus] = useState<'checking' | 'ok' | 'error' | 'unconfigured'>('checking');
  const [paymenterLoading, setPaymenterLoading] = useState(false);
  const hasFetchedPaymenter = useRef(false);

  const [showAddModal, setShowAddModal]     = useState(false);
  const [markPaidInfo, setMarkPaidInfo]     = useState<{ subscriptionId: string; invoiceId?: string } | null>(null);
  const [isPageLoaded, setIsPageLoaded]     = useState(false);

  useEffect(() => { setIsPageLoaded(true); }, []);

  // Sync tab with URL
  useEffect(() => {
    const t = searchParams.get('tab') as BillingTab | null;
    if (t && validTabs.includes(t)) setActiveTab(t);
  }, [searchParams]);

  const handleTabChange = (tab: BillingTab) => {
    setActiveTab(tab);
    setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('tab', tab); return p; }, { replace: true });
  };

  // ── Paymenter connectivity check (lazy: only on sub/billing tab) ──
  const checkPaymenter = useCallback(async (): Promise<boolean> => {
    try {
      const res  = await fetch('/api/paymenter/status');
      const json = await safeJson(res);
      if (json.success) { setPaymenterStatus('ok'); return true; }
      setPaymenterStatus(json.configured === false ? 'unconfigured' : 'error');
    } catch { setPaymenterStatus('error'); }
    return false;
  }, []);

  const loadPaymenterData = useCallback(async () => {
    setPaymenterLoading(true);
    try {
      const [subRes, invRes] = await Promise.all([fetch('/api/paymenter/subscriptions'), fetch('/api/paymenter/invoices')]);
      const [subJson, invJson] = await Promise.all([safeJson(subRes), safeJson(invRes)]);
      if (subJson.success) {
        const raw = Array.isArray(subJson.data?.data) ? subJson.data.data : (Array.isArray(subJson.data) ? subJson.data : []);
        setSubscriptions(raw.map((s: Record<string, unknown>) => mapPaymenterService(s)));
      }
      if (invJson.success) {
        const raw = Array.isArray(invJson.data?.data) ? invJson.data.data : (Array.isArray(invJson.data) ? invJson.data : []);
        setBillingRecords(raw.map((i: Record<string, unknown>) => mapPaymenterInvoice(i)));
      }
    } catch { /* non-critical */ }
    finally { setPaymenterLoading(false); }
  }, []);

  // Lazy-load Paymenter data when subscriptions or billing tab first opened
  useEffect(() => {
    if ((activeTab === 'subscriptions' || activeTab === 'billing') && !hasFetchedPaymenter.current) {
      hasFetchedPaymenter.current = true;
      checkPaymenter().then(ok => { if (ok) loadPaymenterData(); else setPaymenterLoading(false); });
    }
  }, [activeTab, checkPaymenter, loadPaymenterData]);

  // Sync Paymenter invoice statuses in background
  useEffect(() => {
    if (hasSyncedRef.current) return;
    const sync = async () => {
      const linked = allInvoices.filter(inv => inv.paymenterInvoiceId);
      if (!linked.length) return;
      hasSyncedRef.current = true;
      const statusMap: Record<string, string> = { paid: 'Paid', unpaid: 'Sent', overdue: 'Overdue', cancelled: 'Draft' };
      await Promise.allSettled(linked.map(async inv => {
        try {
          const res = await fetch(`/api/paymenter/invoices/${inv.paymenterInvoiceId}`);
          if (!res.ok) return;
          const json = await res.json();
          const mapped = statusMap[json?.data?.status?.toLowerCase?.()] ?? null;
          if (mapped && mapped !== inv.status) await updateInvoiceStatus(inv.id, mapped as any);
        } catch { /* silent */ }
      }));
    };
    sync();
  }, [allInvoices]);

  // ── Filtering ──
  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown Client';

  const brandClientIds = useMemo(() =>
    brandId ? clients.filter(c => c.brandId === brandId).map(c => c.id) : null,
  [brandId, clients]);

  const filteredInvoices = useMemo(() => {
    const base = brandClientIds ? allInvoices.filter(i => brandClientIds.includes(i.clientId)) : allInvoices;
    return base.filter(i =>
      i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClientName(i.clientId).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [brandClientIds, allInvoices, searchQuery]);

  const filteredEstimates = useMemo(() => {
    const base = brandClientIds ? allEstimates.filter(e => brandClientIds.includes(e.clientId)) : allEstimates;
    return base.filter(e =>
      e.estimateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClientName(e.clientId).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [brandClientIds, allEstimates, searchQuery]);

  // ── Invoice actions ──
  const handleInvoiceStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      await updateInvoiceStatus(invoiceId, newStatus as any);
      toast.success(`Invoice status updated to ${newStatus}`);
      if (newStatus === 'Paid') {
        const inv = allInvoices.find(i => i.id === invoiceId);
        if (inv) novuTrigger({ workflowId: 'payment-reminder', payload: { invoiceNumber: inv.invoiceNumber, amount: inv.totals?.totalNet ?? 0, clientName: getClientName(inv.clientId) } });
      }
    } catch { /* toast shown by service */ }
  };

  const handleEstimateStatusChange = async (estimateId: string, newStatus: string) => {
    try {
      await updateEstimateStatus(estimateId, newStatus as any);
      toast.success(`Estimate status updated to ${newStatus}`);
      const est = allEstimates.find(e => e.id === estimateId);
      if (est) novuTrigger({ workflowId: 'estimate-status-changed', payload: { estimateNumber: est.estimateNumber, newStatus, clientName: getClientName(est.clientId) } });
    } catch { /* toast shown by service */ }
  };

  const handleConvertEstimate = async (estimateId: string) => {
    try { const id = await convertEstimateToInvoice(estimateId); toast.success(`Invoice created (${id.slice(0, 8)}…)`); }
    catch { toast.error('Failed to convert estimate'); }
  };

  // ── Subscription actions ──
  const handleSubscriptionAction = async (id: string, action: 'cancel' | 'suspend' | 'unsuspend') => {
    const res  = await fetch(`/api/paymenter/subscriptions/${id}/${action}`, { method: 'PUT' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? `Failed to ${action}`);
    toast.success(`Subscription ${action === 'unsuspend' ? 'reactivated' : action + 'led'}`);
    await loadPaymenterData();
  };

  const handleMarkPaid = (subscriptionId: string) => setMarkPaidInfo({ subscriptionId });

  const handleMarkPaidConfirm = async (reference: string) => {
    if (!markPaidInfo) return;
    const unpaid = billingRecords.find(b => b.subscriptionId === markPaidInfo.subscriptionId && b.status !== 'paid');
    if (!unpaid) { toast.error('No unpaid invoice found'); return; }
    const res  = await fetch(`/api/paymenter/invoices/${unpaid.id}/mark-paid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Failed to mark paid');
    toast.success('Invoice marked as paid');
    await loadPaymenterData();
  };

  // ── Billing status config ──
  const billingStatusCfg: Record<BillingRecord['status'], { color: string; dot: string; label: string }> = {
    paid:    { color: 'text-green-400', dot: 'bg-green-400', label: 'Paid'    },
    unpaid:  { color: 'text-blue-400',  dot: 'bg-blue-400',  label: 'Pending' },
    overdue: { color: 'text-red-400',   dot: 'bg-red-400',   label: 'Overdue' },
  };

  const overdueRec = billingRecords.filter(b => b.status === 'overdue').length;

  const tabCounts: Record<BillingTab, number | null> = {
    invoices:      filteredInvoices.length,
    estimates:     filteredEstimates.length,
    subscriptions: paymenterStatus === 'ok' ? subscriptions.length : null,
    billing:       overdueRec > 0 ? overdueRec : null,
  };

  // ── Admin data sources ──
  const dataSources = [
    { name: 'Invoices',   data: allInvoices,   onSave: () => {} },
    { name: 'Estimates',  data: allEstimates,  onSave: () => {} },
    { name: 'Clients',    data: clients,        onSave: () => {} },
  ];

  // ── Table shared classes ──
  const thCls = 'px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider';
  const tdCls = 'px-6 py-4 whitespace-nowrap';
  const rowCls = 'hover:bg-glass/60 hover:scale-[1.01] transition-all duration-300 animate-fade-in-up group/row border-b border-border-color/30 last:border-b-0';
  const actionBtnCls = 'p-2 text-text-secondary bg-glass/40 hover:bg-glass/60 rounded-lg transition-all duration-300 border border-border-color cursor-pointer hover:scale-110 backdrop-blur-sm';

  return (
    <div>
      <PageStyles />
      {isAdminMode && <AdminPanel dataSources={dataSources} />}

      {/* Header */}
      <div className="flex justify-between items-start mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            {brand ? `Billing — ${brand.name}` : 'Billing'}
          </h1>
          <p className="text-text-secondary">Invoices, estimates, subscriptions, and billing history</p>
        </div>
        {/* Contextual action button */}
        {activeTab === 'invoices' && (
          <Link to="/payments/invoice/new" aria-label="Create Invoice"
            className="p-3 bg-primary text-gray-900 rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 inline-flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </Link>
        )}
        {activeTab === 'estimates' && (
          <Link to="/payments/estimate/new" aria-label="Create Estimate"
            className="p-3 bg-primary text-gray-900 rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 inline-flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </Link>
        )}
        {activeTab === 'subscriptions' && (
          <button onClick={() => setShowAddModal(true)} aria-label="Add Subscription"
            disabled={paymenterStatus !== 'ok'}
            className="p-3 bg-primary text-gray-900 rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        )}
      </div>

      {/* Stats bar — always visible */}
      <StatsBar
        invoices={allInvoices}
        subscriptions={subscriptions}
        billingRecords={billingRecords}
        paymenterOk={paymenterStatus === 'ok'}
        isLoading={paymenterLoading}
      />

      {/* Tab switcher */}
      <TabSwitcher active={activeTab} onChange={handleTabChange} counts={tabCounts} />

      {/* ── Invoices tab ── */}
      {activeTab === 'invoices' && (
        <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl overflow-hidden shadow-xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-color" role="table" aria-label="Invoices">
              <thead className="bg-glass-light/50 backdrop-blur-sm">
                <tr>
                  {['Number', 'Client', 'Date', 'Status', 'Amount', 'Actions'].map(h => (
                    <th key={h} scope="col" className={h === 'Actions' ? `${thCls} text-right` : thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {filteredInvoices.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-16">
                    <div className="text-center animate-fade-in">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-glass-light/60 mb-4 shadow-lg border border-border-color/50">
                        <svg className="w-10 h-10 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2">No invoices yet</h3>
                      <p className="text-text-secondary/90 mb-6 font-medium">Create your first invoice to get started</p>
                      <Link to="/payments/invoice/new" className="inline-flex px-6 py-3 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:scale-105 transition-all duration-300 shadow-lg">
                        Create Invoice
                      </Link>
                    </div>
                  </td></tr>
                )}
                {filteredInvoices.map((invoice, idx) => {
                  const client = clients.find(c => c.id === invoice.clientId);
                  return (
                    <tr key={invoice.id} className={rowCls} style={{ animationDelay: `${idx * 30}ms` }}>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <span className="text-sm font-semibold text-primary font-mono-data">{invoice.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className={tdCls}><span className="text-sm font-medium text-text-primary">{getClientName(invoice.clientId)}</span></td>
                      <td className={tdCls}><span className="text-sm text-text-secondary">{new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></td>
                      <td className={tdCls}><StatusSelect value={invoice.status} onChange={s => handleInvoiceStatusChange(invoice.id, s)} /></td>
                      <td className={tdCls}><span className="text-sm font-bold text-text-primary font-mono-data">{(invoice.totals?.totalNet ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span></td>
                      <td className={`${tdCls} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          {client && <DocumentDownloadButton type="invoice" document={invoice} client={client} userSettings={userSettings} variant="secondary" />}
                          {invoice.paymenterInvoiceId && invoice.status !== 'Paid' && (
                            <button aria-label="Pay Now" title="Pay Now" onClick={async e => {
                              e.stopPropagation();
                              try { const r = await fetch(`/api/paymenter/invoices/${invoice.paymenterInvoiceId}/pay-link`); if (!r.ok) throw new Error(); const j = await r.json(); if (j.payUrl) window.open(j.payUrl, '_blank', 'noopener'); } catch { toast.error('Payment service unavailable'); }
                            }} className={`${actionBtnCls} hover:text-green-400`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                            </button>
                          )}
                          <Link to={`/payments/invoices/edit/${invoice.id}`} aria-label="Edit invoice" title="Edit" className={`${actionBtnCls} hover:text-primary`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </Link>
                          <button aria-label="Delete invoice" title="Delete" onClick={async () => { if (window.confirm('Delete this invoice?')) { try { await deleteInvoice(invoice.id); toast.success('Invoice deleted'); } catch { toast.error('Failed to delete'); } } }} className={`${actionBtnCls} hover:text-red-400`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Estimates tab ── */}
      {activeTab === 'estimates' && (
        <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl overflow-hidden shadow-xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-color" role="table" aria-label="Estimates">
              <thead className="bg-glass-light/50 backdrop-blur-sm">
                <tr>
                  {['Number', 'Client', 'Date', 'Status', 'Amount', 'Actions'].map(h => (
                    <th key={h} scope="col" className={h === 'Actions' ? `${thCls} text-right` : thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {filteredEstimates.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-16">
                    <div className="text-center animate-fade-in">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-glass-light/60 mb-4 shadow-lg border border-border-color/50">
                        <svg className="w-10 h-10 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2">No estimates yet</h3>
                      <p className="text-text-secondary/90 mb-6 font-medium">Create your first estimate to get started</p>
                      <Link to="/payments/estimate/new" className="inline-flex px-6 py-3 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:scale-105 transition-all duration-300 shadow-lg">
                        Create Estimate
                      </Link>
                    </div>
                  </td></tr>
                )}
                {filteredEstimates.map((est, idx) => {
                  const client = clients.find(c => c.id === est.clientId);
                  return (
                    <tr key={est.id} className={rowCls} style={{ animationDelay: `${idx * 30}ms` }}>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                          <span className="text-sm font-semibold text-primary font-mono-data">{est.estimateNumber}</span>
                        </div>
                      </td>
                      <td className={tdCls}><span className="text-sm font-medium text-text-primary">{getClientName(est.clientId)}</span></td>
                      <td className={tdCls}><span className="text-sm text-text-secondary">{new Date(est.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></td>
                      <td className={tdCls}><StatusSelect value={est.status} onChange={s => handleEstimateStatusChange(est.id, s)} /></td>
                      <td className={tdCls}><span className="text-sm font-bold text-text-primary font-mono-data">{(est.totals?.totalNet ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span></td>
                      <td className={`${tdCls} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          {client && <DocumentDownloadButton type="estimate" document={est} client={client} userSettings={userSettings} variant="secondary" />}
                          <Link to={`/payments/estimates/edit/${est.id}`} aria-label="Edit estimate" title="Edit" className={`${actionBtnCls} hover:text-primary`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </Link>
                          <button aria-label="Convert to invoice" title="Convert to Invoice" onClick={() => handleConvertEstimate(est.id)} className={`${actionBtnCls} hover:text-primary`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </button>
                          <button aria-label="Delete estimate" title="Delete" onClick={async () => { if (window.confirm('Delete this estimate?')) { try { await deleteEstimate(est.id); toast.success('Estimate deleted'); } catch { toast.error('Failed to delete'); } } }} className={`${actionBtnCls} hover:text-red-400`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Subscriptions tab ── */}
      {activeTab === 'subscriptions' && (
        <div>
          <PaymenterBanner status={paymenterStatus} />
          {paymenterLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="bg-glass/20 border border-border-color rounded-2xl h-52 animate-pulse" aria-hidden="true" />)}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-glass-light/60 mb-4 border border-border-color/50">
                <svg className="w-10 h-10 text-text-secondary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.091 1.21-.138 2.43-.138 3.662m14.324 0c0 1.232-.046 2.453-.138 3.662a4.006 4.006 0 01-3.7 3.7 48.678 48.678 0 01-7.324 0 4.006 4.006 0 01-3.7-3.7c-.091-1.21-.138-2.43-.138-3.662" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">No subscriptions yet</h3>
              <p className="text-text-secondary mb-6">Create your first hosting subscription to get started</p>
              <button onClick={() => setShowAddModal(true)} disabled={paymenterStatus !== 'ok'}
                className="inline-flex px-6 py-3 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover transition-all duration-300 shadow-lg disabled:opacity-40 cursor-pointer">
                Add Subscription
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map((sub, i) => (
                <SubscriptionCard key={sub.id} subscription={sub}
                  client={clients.find(c => c.paymenterUserId != null && c.paymenterUserId === sub.paymenterClientId)}
                  onStatusChange={handleSubscriptionAction}
                  onMarkPaid={handleMarkPaid}
                  animationDelay={i * 50}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Billing History tab ── */}
      {activeTab === 'billing' && (
        <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl overflow-hidden shadow-xl animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <PaymenterBanner status={paymenterStatus} />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-color" role="table" aria-label="Billing History">
              <thead className="bg-glass-light/50 backdrop-blur-sm">
                <tr>
                  {['Invoice ID', 'Client', 'Amount', 'Due Date', 'Status', 'Reference', 'Actions'].map(h => (
                    <th key={h} scope="col" className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {paymenterLoading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-text-secondary text-sm">Loading billing records…</td></tr>
                ) : billingRecords.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center"><p className="text-text-secondary text-sm">No billing records found</p></td></tr>
                ) : (
                  billingRecords.map((rec, i) => {
                    const scfg   = billingStatusCfg[rec.status];
                    const client = clients.find(c => c.paymenterUserId != null && String(c.paymenterUserId) === rec.clientId);
                    return (
                      <tr key={rec.id} className="hover:bg-glass/60 transition-all duration-200 animate-fade-in-up" style={{ animationDelay: `${i * 25}ms` }}>
                        <td className={tdCls}><span className="text-sm font-semibold text-primary font-mono-data">#{rec.id}</span></td>
                        <td className={`${tdCls} text-sm text-text-primary`}>{client?.name ?? `Client #${rec.clientId}`}</td>
                        <td className={tdCls}><span className="text-sm font-bold text-text-primary font-mono-data">{rec.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-primary font-semibold">MAD</span></span></td>
                        <td className={`${tdCls} text-sm text-text-secondary`}>{new Date(rec.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className={tdCls}>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${scfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${scfg.dot}`} aria-hidden="true" />
                            {scfg.label}
                          </span>
                        </td>
                        <td className={`${tdCls} text-sm text-text-secondary`}>{rec.reference || '—'}</td>
                        <td className={`${tdCls} text-right`}>
                          {rec.status !== 'paid' && (
                            <button onClick={() => setMarkPaidInfo({ subscriptionId: rec.subscriptionId, invoiceId: rec.id })}
                              className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary hover:text-background transition-all duration-200 cursor-pointer">
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
        <AddSubscriptionModal clients={clients} onClose={() => setShowAddModal(false)} onSuccess={loadPaymenterData} />
      )}
      {markPaidInfo && (
        <MarkPaidModal subscriptionId={markPaidInfo.subscriptionId} onClose={() => setMarkPaidInfo(null)} onConfirm={handleMarkPaidConfirm} />
      )}
    </div>
  );
};

export default BillingPage;
