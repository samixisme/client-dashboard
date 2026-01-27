

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

// Modern StatusSelect Component with color-coded icons
const StatusSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (newStatus: string) => void;
}) => {
  const statusConfig = {
    'Draft': { color: 'bg-gray-500/20 text-gray-700 border-gray-500/30', icon: '📝' },
    'Sent': { color: 'bg-blue-500/20 text-blue-700 border-blue-500/30', icon: '📤' },
    'Paid': { color: 'bg-green-500/20 text-green-700 border-green-500/30', icon: '✓' },
    'Overdue': { color: 'bg-red-500/20 text-red-700 border-red-500/30', icon: '⚠' }
  };

  const config = statusConfig[value as keyof typeof statusConfig];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        px-3 py-1.5 border rounded-lg text-xs font-semibold
        focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
        cursor-pointer transition-all duration-200
        ${config.color}
      `}
    >
      <option value="Draft">📝 Draft</option>
      <option value="Sent">📤 Sent</option>
      <option value="Paid">✓ Paid</option>
      <option value="Overdue">⚠ Overdue</option>
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
        { name: 'Invoices', data: allInvoices, onSave: (newData: any) => updateData('invoices', newData) },
        { name: 'Estimates', data: allEstimates, onSave: (newData: any) => updateData('estimates', newData) },
        { name: 'Clients', data: clients, onSave: (newData: any) => updateData('clients', newData) },
    ];

    return (
        <div>
            {isAdminMode && <AdminPanel dataSources={dataSources} />}

            {/* Modern Header with Card Background */}
            <div className="bg-glass-light border border-border-color rounded-xl p-6 mb-6">
                <div className="flex justify-between items-start">
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
            </div>

            {/* Modern Pill-Style Tab Navigation with Sliding Indicator */}
            <div className="relative inline-flex items-center gap-2 mb-6 bg-glass-light rounded-lg p-1 border border-border-color">
                {/* Sliding background indicator */}
                <div
                    className="absolute top-1 bottom-1 bg-primary rounded-lg shadow-md transition-all duration-300 ease-out"
                    style={{
                        left: activeTab === 'invoices' ? '4px' : 'calc(50% + 2px)',
                        width: 'calc(50% - 6px)'
                    }}
                />

                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`
                        relative px-6 py-3 text-sm font-semibold rounded-lg transition-colors duration-200 z-10
                        ${activeTab === 'invoices'
                            ? 'text-gray-900'
                            : 'text-text-secondary hover:text-text-primary'
                        }
                    `}
                >
                    Invoices
                    {filteredInvoices.length > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs transition-colors duration-200 ${
                            activeTab === 'invoices' ? 'bg-black/10' : 'bg-glass'
                        }`}>
                            {filteredInvoices.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('estimates')}
                    className={`
                        relative px-6 py-3 text-sm font-semibold rounded-lg transition-colors duration-200 z-10
                        ${activeTab === 'estimates'
                            ? 'text-gray-900'
                            : 'text-text-secondary hover:text-text-primary'
                        }
                    `}
                >
                    Estimates
                    {filteredEstimates.length > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs transition-colors duration-200 ${
                            activeTab === 'estimates' ? 'bg-black/10' : 'bg-glass'
                        }`}>
                            {filteredEstimates.length}
                        </span>
                    )}
                </button>
            </div>
            
            {/* Modern Card-Style Table with Enhanced Design */}
            <div className="bg-glass-light border border-border-color rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-color">
                        <thead className="bg-glass">
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
                            {/* Empty State for Invoices */}
                            {activeTab === 'invoices' && filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16">
                                        <div className="text-center">
                                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-glass mb-4">
                                                <span className="text-4xl">📄</span>
                                            </div>
                                            <h3 className="text-lg font-semibold text-text-primary mb-2">
                                                No invoices yet
                                            </h3>
                                            <p className="text-text-secondary mb-6">
                                                Create your first invoice to get started
                                            </p>
                                            <Link
                                                to="/payments/invoice/new"
                                                className="inline-flex px-6 py-3 bg-primary text-gray-900 text-sm font-semibold rounded-lg hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                            >
                                                + Create Invoice
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Invoice Rows with Enhanced Design */}
                            {activeTab === 'invoices' && filteredInvoices.map((invoice) => {
                                const client = clients.find(c => c.id === invoice.clientId);
                                return (
                                <tr key={invoice.id} className="hover:bg-glass transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-text-secondary">📄</span>
                                            <span className="text-sm font-semibold text-primary">{invoice.invoiceNumber}</span>
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
                                                className="px-4 py-2 text-xs font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all duration-200 border border-blue-500/20 cursor-pointer"
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
                                                className="px-4 py-2 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all duration-200 border border-red-500/20 cursor-pointer"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}

                            {/* Empty State for Estimates */}
                            {activeTab === 'estimates' && filteredEstimates.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16">
                                        <div className="text-center">
                                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-glass mb-4">
                                                <span className="text-4xl">📋</span>
                                            </div>
                                            <h3 className="text-lg font-semibold text-text-primary mb-2">
                                                No estimates yet
                                            </h3>
                                            <p className="text-text-secondary mb-6">
                                                Create your first estimate to get started
                                            </p>
                                            <Link
                                                to="/payments/estimate/new"
                                                className="inline-flex px-6 py-3 bg-primary text-gray-900 text-sm font-semibold rounded-lg hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                            >
                                                + Create Estimate
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Estimate Rows with Enhanced Design */}
                            {activeTab === 'estimates' && filteredEstimates.map((estimate) => {
                                const client = clients.find(c => c.id === estimate.clientId);
                                return (
                                <tr key={estimate.id} className="hover:bg-glass transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-text-secondary">📋</span>
                                            <span className="text-sm font-semibold text-primary">{estimate.estimateNumber}</span>
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
                                                className="px-4 py-2 text-xs font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all duration-200 border border-blue-500/20 cursor-pointer"
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
                                                className="px-4 py-2 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all duration-200 border border-red-500/20 cursor-pointer"
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