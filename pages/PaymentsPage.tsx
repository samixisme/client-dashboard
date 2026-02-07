
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

// Modern StatusSelect Component with custom styled dropdown
const StatusSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (newStatus: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const statusConfig = {
    'Draft': { circleColor: 'bg-gray-400', shadowColor: 'shadow-[0_0_8px_rgba(156,163,175,0.6)]', hoverBg: 'hover:bg-white/5' },
    'Sent': { circleColor: 'bg-blue-400', shadowColor: 'shadow-[0_0_8px_rgba(96,165,250,0.6)]', hoverBg: 'hover:bg-white/5' },
    'Paid': { circleColor: 'bg-green-400', shadowColor: 'shadow-[0_0_8px_rgba(74,222,128,0.6)]', hoverBg: 'hover:bg-white/5' },
    'Overdue': { circleColor: 'bg-red-400', shadowColor: 'shadow-[0_0_8px_rgba(248,113,113,0.6)]', hoverBg: 'hover:bg-white/5' }
  };

  const config = statusConfig[value as keyof typeof statusConfig];
  const statuses = ['Draft', 'Sent', 'Paid', 'Overdue'] as const;

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        ref={buttonRef}
        onClick={handleOpen}
        className="inline-flex items-center gap-2 bg-glass/40 backdrop-blur-xl border border-border-color/50 rounded-lg px-3 py-1.5 hover:bg-glass/60 transition-all duration-300 shadow-sm cursor-pointer"
      >
        <div className={`w-2 h-2 rounded-full ${config.circleColor} ${config.shadowColor}`} />
        <span className="text-xs font-semibold text-text-primary">{value}</span>
        <svg
          className={`w-3 h-3 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div
            className="fixed z-[9999] min-w-[120px] rounded-xl overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              background: 'rgba(18, 18, 18, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(163, 230, 53, 0.15)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="p-1">
              {statuses.map((status) => {
                const statusConf = statusConfig[status];
                const isSelected = status === value;
                return (
                  <button
                    type="button"
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(status);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all duration-200 cursor-pointer ${isSelected ? 'bg-primary/15' : 'hover:bg-white/5'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${statusConf.circleColor} ${statusConf.shadowColor}`} />
                    <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                      {status}
                    </span>
                    {isSelected && (
                      <svg className="w-3 h-3 text-primary ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
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
                            className="p-3 bg-primary text-gray-900 rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 inline-flex items-center justify-center"
                            title="Create Invoice"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </Link>
                    ) : (
                        <Link
                            to="/payments/estimate/new"
                            className="p-3 bg-primary text-gray-900 rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 inline-flex items-center justify-center"
                            title="Create Estimate"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
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
                                                className="p-2 text-text-secondary hover:text-primary bg-glass/40 hover:bg-glass/60 rounded-lg transition-all duration-300 border border-border-color cursor-pointer hover:scale-110 backdrop-blur-sm"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this invoice?')) {
                                                        const updatedInvoices = allInvoices.filter(inv => inv.id !== invoice.id);
                                                        updateData('invoices', updatedInvoices);
                                                        toast.success('Invoice deleted successfully');
                                                    }
                                                }}
                                                className="p-2 text-text-secondary hover:text-red-400 bg-glass/40 hover:bg-glass/60 rounded-lg transition-all duration-300 border border-border-color cursor-pointer hover:scale-110 backdrop-blur-sm"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
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
                                                className="p-2 text-text-secondary hover:text-primary bg-glass/40 hover:bg-glass/60 rounded-lg transition-all duration-300 border border-border-color cursor-pointer hover:scale-110 backdrop-blur-sm"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this estimate?')) {
                                                        const updatedEstimates = allEstimates.filter(est => est.id !== estimate.id);
                                                        updateData('estimates', updatedEstimates);
                                                        toast.success('Estimate deleted successfully');
                                                    }
                                                }}
                                                className="p-2 text-text-secondary hover:text-red-400 bg-glass/40 hover:bg-glass/60 rounded-lg transition-all duration-300 border border-border-color cursor-pointer hover:scale-110 backdrop-blur-sm"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
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