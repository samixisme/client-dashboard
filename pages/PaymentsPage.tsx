
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';
import { useAdmin } from '../contexts/AdminContext';
import { useData } from '../contexts/DataContext';
import AdminPanel from '../components/admin/AdminPanel';
import { InvoiceDownloadButton } from '../src/components/payments/InvoiceDownloadButton';
import { EstimateDownloadButton } from '../src/components/payments/EstimateDownloadButton';
import { userSettings } from '../data/paymentsData';
import { toast } from 'sonner';
import { Invoice, Estimate, Client } from '../types';

// Modern StatusSelect Component with enhanced glass morphism
const StatusSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (newStatus: string) => void;
}) => {
  const statusConfig = {
    'Draft': { color: 'bg-gray-500/15 text-gray-400 border-gray-500/50 shadow-[0_0_8px_rgba(107,114,128,0.2)]' },
    'Sent': { color: 'bg-blue-500/15 text-blue-400 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.2)]' },
    'Paid': { color: 'bg-green-500/15 text-green-400 border-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.2)]' },
    'Overdue': { color: 'bg-red-500/15 text-red-400 border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]' }
  };

  const config = statusConfig[value as keyof typeof statusConfig];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        px-3 py-1.5 border rounded-lg text-xs font-semibold backdrop-blur-sm
        focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
        cursor-pointer transition-all duration-300 hover:scale-105
        ${config.color}
      `}
    >
      <option value="Draft">Draft</option>
      <option value="Sent">Sent</option>
      <option value="Paid">Paid</option>
      <option value="Overdue">Overdue</option>
    </select>
  );
};

const PaymentsPage = () => {
    const [searchParams] = useSearchParams();
    const { isAdminMode } = useAdmin();
    const { data, updateData } = useData();
    const { invoices: allInvoices, estimates: allEstimates, clients, brands } = data;

    const tabFromUrl = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<'invoices' | 'estimates'>(tabFromUrl === 'estimates' ? 'estimates' : 'invoices');
    const { searchQuery } = useSearch();
    const brandId = searchParams.get('brandId');
    const brand = brandId ? brands.find(b => b.id === brandId) : null;
    const [isPageLoaded, setIsPageLoaded] = useState(false);

    useEffect(() => {
        setIsPageLoaded(true);
    }, []);

    useEffect(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl === 'estimates') {
            setActiveTab('estimates');
        } else {
            setActiveTab('invoices');
        }
    }, [searchParams]);

    const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || 'Unknown Client';

    // Handle status change for invoices
    const handleInvoiceStatusChange = (invoiceId: string, newStatus: string) => {
        const updatedInvoices = allInvoices.map(inv =>
            inv.id === invoiceId ? { ...inv, status: newStatus as 'Draft' | 'Sent' | 'Paid' | 'Overdue' } : inv
        );
        updateData('invoices', updatedInvoices);
        toast.success(`Invoice status updated to ${newStatus}`);
    };

    // Handle status change for estimates
    const handleEstimateStatusChange = (estimateId: string, newStatus: string) => {
        const updatedEstimates = allEstimates.map(est =>
            est.id === estimateId ? { ...est, status: newStatus as 'Draft' | 'Sent' | 'Paid' | 'Overdue' } : est
        );
        updateData('estimates', updatedEstimates);
        toast.success(`Estimate status updated to ${newStatus}`);
    };
    
    const brandClientIds = useMemo(() => {
        if (!brandId) return null;
        return clients.filter(c => c.brandId === brandId).map(c => c.id);
    }, [brandId, clients]);

    const filteredInvoices = useMemo(() => {
        let invs = brandClientIds 
            ? allInvoices.filter(i => brandClientIds.includes(i.clientId)) 
            : allInvoices;
            
        return invs.filter(i => 
            i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            getClientName(i.clientId).toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [brandClientIds, allInvoices, searchQuery, getClientName]);

    const filteredEstimates = useMemo(() => {
        let ests = brandClientIds
            ? allEstimates.filter(e => brandClientIds.includes(e.clientId))
            : allEstimates;

        return ests.filter(e =>
            e.estimateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            getClientName(e.clientId).toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [brandClientIds, allEstimates, searchQuery, getClientName]);

    const dataSources = [
        { name: 'Invoices', data: allInvoices, onSave: (newData: Invoice[]) => updateData('invoices', newData) },
        { name: 'Estimates', data: allEstimates, onSave: (newData: Estimate[]) => updateData('estimates', newData) },
        { name: 'Clients', data: clients, onSave: (newData: Client[]) => updateData('clients', newData) },
    ];

    return (
        <div>
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes pulse-glow {
                    0%, 100% {
                        box-shadow: 0 0 8px var(--primary);
                    }
                    50% {
                        box-shadow: 0 0 20px var(--primary);
                    }
                }

                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(200%);
                    }
                }

                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .animate-fade-in-up {
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }

                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }

                .animate-slide-in-right {
                    animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .animate-pulse-glow {
                    animation: pulse-glow 2.5s ease-in-out infinite;
                }

                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }

                .animate-scale-in {
                    animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            {isAdminMode && <AdminPanel dataSources={dataSources} />}

            {/* Header */}
            <div className="flex justify-between items-start mb-8 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary mb-2">
                        {brand ? `Payments for ${brand.name}` : 'Payments'}
                    </h1>
                    <p className="text-text-secondary">
                        Manage your invoices and estimates with ease
                    </p>
                </div>
                <div>
                    {activeTab === 'invoices' ? (
                        <Link
                            to="/payments/invoice/new"
                            className="px-6 py-3 bg-primary text-gray-900 text-sm font-semibold rounded-lg hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                            + Create Invoice
                        </Link>
                    ) : (
                        <Link
                            to="/payments/estimate/new"
                            className="px-6 py-3 bg-primary text-gray-900 text-sm font-semibold rounded-lg hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                            + Create Estimate
                        </Link>
                    )}
                </div>
            </div>

            {/* Enhanced Tab Switcher with Glass Morphism */}
            <div className="relative inline-flex items-center gap-2 mb-6 bg-glass/60 backdrop-blur-xl rounded-xl p-1.5 border border-border-color shadow-md animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                {/* Enhanced sliding background indicator */}
                <div
                    className="absolute top-1.5 bottom-1.5 bg-primary rounded-lg shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] transition-all duration-300 ease-out"
                    style={{
                        left: activeTab === 'invoices' ? '6px' : 'calc(50% + 3px)',
                        width: 'calc(50% - 9px)'
                    }}
                />

                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`
                        relative px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 z-10
                        ${activeTab === 'invoices'
                            ? 'text-background scale-105'
                            : 'text-text-secondary hover:text-text-primary hover:scale-105'
                        }
                    `}
                >
                    Invoices
                    {filteredInvoices.length > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold backdrop-blur-sm transition-all duration-300 ${
                            activeTab === 'invoices' ? 'bg-background/20 shadow-lg' : 'bg-glass-light/60'
                        }`}>
                            {filteredInvoices.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('estimates')}
                    className={`
                        relative px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 z-10
                        ${activeTab === 'estimates'
                            ? 'text-background scale-105'
                            : 'text-text-secondary hover:text-text-primary hover:scale-105'
                        }
                    `}
                >
                    Estimates
                    {filteredEstimates.length > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold backdrop-blur-sm transition-all duration-300 ${
                            activeTab === 'estimates' ? 'bg-background/20 shadow-lg' : 'bg-glass-light/60'
                        }`}>
                            {filteredEstimates.length}
                        </span>
                    )}
                </button>
            </div>
            
            {/* Modernized Table with Glass Morphism */}
            <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl overflow-hidden shadow-xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-color">
                        <thead className="bg-glass-light/50 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Number</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Client</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {/* Enhanced Empty State for Invoices */}
                            {activeTab === 'invoices' && filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16">
                                        <div className="text-center animate-fade-in">
                                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-glass-light/60 backdrop-blur-sm mb-4 shadow-lg animate-scale-in border border-border-color/50">
                                                <svg className="w-10 h-10 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-text-primary mb-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                                                No invoices yet
                                            </h3>
                                            <p className="text-text-secondary/90 mb-6 font-medium animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                                Create your first invoice to get started
                                            </p>
                                            <Link
                                                to="/payments/invoice/new"
                                                className="inline-flex px-6 py-3 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group/btn animate-fade-in-up"
                                                style={{ animationDelay: '300ms' }}
                                            >
                                                <span className="relative z-10 flex items-center gap-2">
                                                    <svg className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                                    Create Invoice
                                                </span>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Invoice Rows with Staggered Animations */}
                            {activeTab === 'invoices' && filteredInvoices.map((invoice, index) => {
                                const client = clients.find(c => c.id === invoice.clientId);
                                return (
                                <tr
                                    key={invoice.id}
                                    className="hover:bg-glass/60 hover:scale-[1.01] transition-all duration-300 animate-fade-in-up group/row border-b border-border-color/30 last:border-b-0"
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-sm font-semibold text-primary group-hover/row:text-primary transition-colors duration-300">{invoice.invoiceNumber}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-text-primary">{getClientName(invoice.clientId)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-text-secondary">
                                            {new Date(invoice.date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusSelect
                                            value={invoice.status}
                                            onChange={(newStatus) => handleInvoiceStatusChange(invoice.id, newStatus)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-text-primary">
                                            {(invoice.totals?.totalNet ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {client && (
                                                <InvoiceDownloadButton
                                                    invoice={invoice}
                                                    client={client}
                                                    userSettings={userSettings}
                                                    variant="secondary"
                                                />
                                            )}
                                            <Link
                                                to={`/payments/invoices/edit/${invoice.id}`}
                                                className="px-4 py-2 text-xs font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all duration-300 border border-blue-500/20 cursor-pointer hover:scale-110 hover:shadow-[0_8px_30px_rgba(59,130,246,0.3)]"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this invoice?')) {
                                                        const updatedInvoices = allInvoices.filter(inv => inv.id !== invoice.id);
                                                        updateData('invoices', updatedInvoices);
                                                        toast.success('Invoice deleted successfully');
                                                    }
                                                }}
                                                className="px-4 py-2 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all duration-300 border border-red-500/20 cursor-pointer hover:scale-110 hover:shadow-[0_8px_30px_rgba(239,68,68,0.3)]"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}

                            {/* Enhanced Empty State for Estimates */}
                            {activeTab === 'estimates' && filteredEstimates.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16">
                                        <div className="text-center animate-fade-in">
                                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-glass-light/60 backdrop-blur-sm mb-4 shadow-lg animate-scale-in border border-border-color/50">
                                                <svg className="w-10 h-10 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-text-primary mb-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                                                No estimates yet
                                            </h3>
                                            <p className="text-text-secondary/90 mb-6 font-medium animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                                Create your first estimate to get started
                                            </p>
                                            <Link
                                                to="/payments/estimate/new"
                                                className="inline-flex px-6 py-3 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group/btn animate-fade-in-up"
                                                style={{ animationDelay: '300ms' }}
                                            >
                                                <span className="relative z-10 flex items-center gap-2">
                                                    <svg className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                                    Create Estimate
                                                </span>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Estimate Rows with Staggered Animations */}
                            {activeTab === 'estimates' && filteredEstimates.map((estimate, index) => {
                                const client = clients.find(c => c.id === estimate.clientId);
                                return (
                                <tr
                                    key={estimate.id}
                                    className="hover:bg-glass/60 hover:scale-[1.01] transition-all duration-300 animate-fade-in-up group/row border-b border-border-color/30 last:border-b-0"
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                            </svg>
                                            <span className="text-sm font-semibold text-primary group-hover/row:text-primary transition-colors duration-300">{estimate.estimateNumber}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-text-primary">{getClientName(estimate.clientId)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-text-secondary">
                                            {new Date(estimate.date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusSelect
                                            value={estimate.status}
                                            onChange={(newStatus) => handleEstimateStatusChange(estimate.id, newStatus)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-text-primary">
                                            {(estimate.totals?.totalNet ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {client && (
                                                <EstimateDownloadButton
                                                    estimate={estimate}
                                                    client={client}
                                                    userSettings={userSettings}
                                                    variant="secondary"
                                                />
                                            )}
                                            <Link
                                                to={`/payments/estimates/edit/${estimate.id}`}
                                                className="px-4 py-2 text-xs font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all duration-300 border border-blue-500/20 cursor-pointer hover:scale-110 hover:shadow-[0_8px_30px_rgba(59,130,246,0.3)]"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this estimate?')) {
                                                        const updatedEstimates = allEstimates.filter(est => est.id !== estimate.id);
                                                        updateData('estimates', updatedEstimates);
                                                        toast.success('Estimate deleted successfully');
                                                    }
                                                }}
                                                className="px-4 py-2 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all duration-300 border border-red-500/20 cursor-pointer hover:scale-110 hover:shadow-[0_8px_30px_rgba(239,68,68,0.3)]"
                                            >
                                                Delete
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
        </div>
    );
};

export default PaymentsPage;