

import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';
import { useAdmin } from '../contexts/AdminContext';
import { useData } from '../contexts/DataContext';
import AdminPanel from '../components/admin/AdminPanel';
import { InvoiceDownloadButton } from '../src/components/payments/InvoiceDownloadButton';
import { EstimateDownloadButton } from '../src/components/payments/EstimateDownloadButton';
import { userSettings } from '../data/paymentsData';


const StatusBadge = ({ status }: { status: string }) => {
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
  let colorClasses = '';
  switch (status) {
    case 'Paid':
      colorClasses = 'bg-green-500/20 text-green-400';
      break;
    case 'Sent':
      colorClasses = 'bg-blue-500/20 text-blue-400';
      break;
    case 'Draft':
      colorClasses = 'bg-gray-500/20 text-gray-400';
      break;
    case 'Overdue':
      colorClasses = 'bg-red-500/20 text-red-400';
      break;
  }
  return <span className={`${baseClasses} ${colorClasses}`}>{status}</span>;
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
    };

    // Handle status change for estimates
    const handleEstimateStatusChange = (estimateId: string, newStatus: string) => {
        const updatedEstimates = allEstimates.map(est =>
            est.id === estimateId ? { ...est, status: newStatus as 'Draft' | 'Sent' | 'Paid' | 'Overdue' } : est
        );
        updateData('estimates', updatedEstimates);
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">{brand ? `Payments for ${brand.name}` : 'Payments'}</h1>
                    <p className="mt-2 text-text-secondary">Manage your invoices and estimates.</p>
                </div>
                <div>
                    {activeTab === 'invoices' ? (
                         <Link to="/payments/invoice/new" className="px-4 py-2 bg-primary text-text-primary text-sm font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary">
                            Create New Invoice
                        </Link>
                    ) : (
                         <Link to="/payments/estimate/new" className="px-4 py-2 bg-primary text-text-primary text-sm font-medium rounded-lg hover:bg-primary-hover">
                            Create New Estimate
                        </Link>
                    )}
                </div>
            </div>

            <div className="mt-8 border-b border-border-color flex items-center gap-4">
                <button onClick={() => setActiveTab('invoices')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'invoices' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}>Invoices</button>
                <button onClick={() => setActiveTab('estimates')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'estimates' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}>Estimates</button>
            </div>
            
            <div className="mt-6 bg-glass rounded-lg border border-border-color overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-color">
                        <thead className="bg-glass-light">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Number</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Client</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Total</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {activeTab === 'invoices' && filteredInvoices.map((invoice) => {
                                const client = clients.find(c => c.id === invoice.clientId);
                                return (
                                <tr key={invoice.id} className="hover:bg-glass-light">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{invoice.invoiceNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{getClientName(invoice.clientId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{new Date(invoice.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <select
                                            value={invoice.status}
                                            onChange={(e) => handleInvoiceStatusChange(invoice.id, e.target.value)}
                                            className="px-3 py-1 border border-border-color bg-glass-light text-text-primary rounded-lg text-xs font-medium focus:outline-none focus:ring-primary focus:border-primary"
                                        >
                                            <option value="Draft">Draft</option>
                                            <option value="Sent">Sent</option>
                                            <option value="Paid">Paid</option>
                                            <option value="Overdue">Overdue</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-semibold">{(invoice.totals?.totalNet ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center gap-2">
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
                                                className="px-3 py-1 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this invoice?')) {
                                                        const updatedInvoices = allInvoices.filter(inv => inv.id !== invoice.id);
                                                        updateData('invoices', updatedInvoices);
                                                    }
                                                }}
                                                className="px-3 py-1 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                             {activeTab === 'estimates' && filteredEstimates.map((estimate) => {
                                const client = clients.find(c => c.id === estimate.clientId);
                                return (
                                <tr key={estimate.id} className="hover:bg-glass-light">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{estimate.estimateNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{getClientName(estimate.clientId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{new Date(estimate.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <select
                                            value={estimate.status}
                                            onChange={(e) => handleEstimateStatusChange(estimate.id, e.target.value)}
                                            className="px-3 py-1 border border-border-color bg-glass-light text-text-primary rounded-lg text-xs font-medium focus:outline-none focus:ring-primary focus:border-primary"
                                        >
                                            <option value="Draft">Draft</option>
                                            <option value="Sent">Sent</option>
                                            <option value="Paid">Paid</option>
                                            <option value="Overdue">Overdue</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-semibold">{(estimate.totals?.totalNet ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center gap-2">
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
                                                className="px-3 py-1 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this estimate?')) {
                                                        const updatedEstimates = allEstimates.filter(est => est.id !== estimate.id);
                                                        updateData('estimates', updatedEstimates);
                                                    }
                                                }}
                                                className="px-3 py-1 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
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