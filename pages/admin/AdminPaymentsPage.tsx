import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DollarSign, AlertCircle, CheckCircle, FileText, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminApi } from '../../hooks/useAdminApi';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminStatsCard } from '../../components/admin/AdminStatsCard';
import { AdminDataTable } from '../../components/admin/AdminDataTable';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';
import { AdminLoadingSkeleton } from '../../components/admin/AdminLoadingSkeleton';
import { Invoice, Estimate, Client } from '../../types';

export default function AdminPaymentsPage() {
  const { get, patch, del, loading } = useAdminApi();
  const [activeTab, setActiveTab] = useState<'invoices' | 'estimates'>('invoices');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [invRes, estRes, cliRes] = await Promise.all([
        get<Invoice[]>('/invoices'),
        get<Estimate[]>('/estimates'),
        get<Client[]>('/clients')
      ]);
      if (invRes) setInvoices(invRes);
      if (estRes) setEstimates(estRes);
      if (cliRes) setClients(cliRes);
    } catch {
      toast.error('Failed to load payments data');
    } finally {
      setInitialLoad(false);
    }
  }, [get]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatMAD = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MAD' }).format(val);
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      }).format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString).getTime() < new Date().getTime();
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const handleStatusChange = async (type: 'invoices' | 'estimates', id: string, newStatus: string) => {
    const res = await patch(`/${type}/${id}`, { status: newStatus });
    if (res) {
      toast.success(`${type === 'invoices' ? 'Invoice' : 'Estimate'} marked as ${newStatus}`);
      fetchData();
    }
  };

  const handleDelete = async (type: 'invoices' | 'estimates', id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) return;
    const res = await del(`/${type}/${id}`);
    if (res) {
      toast.success(`${type === 'invoices' ? 'Invoice' : 'Estimate'} deleted`);
      fetchData();
    }
  };

  const getColumns = <T extends Invoice | Estimate>(type: 'invoices' | 'estimates'): ColumnDef<T>[] => [
    {
      id: 'number',
      header: 'Number',
      accessorFn: (row: T) => ('invoiceNumber' in row ? row.invoiceNumber : 'estimateNumber' in row ? row.estimateNumber : (row as unknown as Invoice | Estimate).id),
      cell: info => <span className="font-bold text-text-primary">{String(info.getValue())}</span>
    },
    {
      accessorKey: 'clientId',
      header: 'Client',
      cell: info => <span className="text-text-primary">{getClientName(info.getValue() as string)}</span>
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: info => <span className="text-text-secondary">{formatDate(info.getValue() as string)}</span>
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: info => {
        const val = info.getValue() as string;
        const row = info.row.original;
        const overdue = isOverdue(val) && row.status !== 'Paid';
        return <span className={overdue ? 'text-red-400 font-medium' : 'text-text-secondary'}>
          {formatDate(val)}
        </span>;
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: info => {
        const status = info.getValue() as string;
        let colorClass = 'bg-gray-500/10 text-gray-400';
        if (status === 'Sent') colorClass = 'bg-blue-500/10 text-blue-400';
        if (status === 'Paid') colorClass = 'bg-green-500/10 text-green-400';
        if (status === 'Overdue') colorClass = 'bg-red-500/10 text-red-400';

        return (
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${colorClass}`}>
            {status}
          </span>
        );
      }
    },
    {
      id: 'total',
      header: 'Total',
      cell: info => {
        const row = info.row.original;
        return <span className="text-text-primary font-medium">{formatMAD(row.totals?.totalNet || 0)}</span>;
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: info => {
        const row = info.row.original;
        const status = row.status;
        const id = row.id;

        return (
          <div className="flex items-center gap-2">
            {status === 'Draft' && (
              <button 
                onClick={() => handleStatusChange(type, id, 'Sent')}
                className="px-3 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
              >
                Send
              </button>
            )}
            {status === 'Sent' && (
              <button 
                onClick={() => handleStatusChange(type, id, 'Paid')}
                className="px-3 py-1 text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded transition-colors"
              >
                Mark Paid
              </button>
            )}

            <div className="relative group z-50">
              <button className="p-1 text-text-secondary hover:text-text-primary rounded transition-colors">
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute right-0 mt-1 w-36 bg-glass border border-border-color rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-1">
                <button 
                  onClick={() => toast.info('Download PDF feature coming soon')}
                  className="w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-glass-light hover:text-white transition-colors"
                >
                  Download PDF
                </button>
                <button 
                  onClick={() => toast.info('Duplicate feature coming soon')}
                  className="w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-glass-light hover:text-white transition-colors"
                >
                  Duplicate
                </button>
                <button 
                  onClick={() => handleDelete(type, id)}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          </div>
        );
      }
    }
  ] as ColumnDef<T>[];

  const invoiceColumns = useMemo(() => getColumns<Invoice>('invoices'), [clients]);
  const estimateColumns = useMemo(() => getColumns<Estimate>('estimates'), [clients]);

  const getBulkActions = (type: 'invoices' | 'estimates') => [
    {
      label: 'Mark as Sent',
      onClick: async (selectedIds: string[]) => {
        const promises = selectedIds.map(id => patch(`/${type}/${id}`, { status: 'Sent' }));
        await Promise.all(promises);
        toast.success(`Marked ${selectedIds.length} ${type} as Sent`);
        fetchData();
      }
    },
    {
      label: 'Mark as Paid',
      onClick: async (selectedIds: string[]) => {
        const promises = selectedIds.map(id => patch(`/${type}/${id}`, { status: 'Paid' }));
        await Promise.all(promises);
        toast.success(`Marked ${selectedIds.length} ${type} as Paid`);
        fetchData();
      }
    },
    {
      label: 'Delete Selected',
      variant: 'danger' as const,
      onClick: async (selectedIds: string[]) => {
        if (!window.confirm(`Delete ${selectedIds.length} selected ${type}?`)) return;
        const promises = selectedIds.map(id => del(`/${type}/${id}`));
        await Promise.all(promises);
        toast.success(`Deleted ${selectedIds.length} ${type}`);
        fetchData();
      }
    }
  ];

  const revenue = invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + (i.totals?.totalNet || 0), 0);
  const outstanding = invoices.filter(i => ['Sent', 'Overdue'].includes(i.status)).reduce((acc, i) => acc + (i.totals?.totalNet || 0), 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const paidThisMonth = invoices.filter(i => {
    if (i.status !== 'Paid') return false;
    const d = new Date(i.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((acc, i) => acc + (i.totals?.totalNet || 0), 0);
  
  const draftCount = invoices.filter(i => i.status === 'Draft').length + estimates.filter(e => e.status === 'Draft').length;

  const headerActions = (
    <div className="relative group z-20">
      <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors">
        Create <ChevronDown className="h-4 w-4" />
      </button>
      <div className="absolute right-0 mt-2 w-48 bg-glass border border-border-color rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-1">
        <Link 
          to="/invoices/create" 
          className="block px-4 py-2 text-sm text-text-primary hover:bg-glass-light hover:text-white transition-colors"
        >
          Create Invoice
        </Link>
        <Link 
          to="/estimates/create" 
          className="block px-4 py-2 text-sm text-text-primary hover:bg-glass-light hover:text-white transition-colors"
        >
          Create Estimate
        </Link>
      </div>
    </div>
  );

  if (initialLoad) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Payments" description="Manage invoices and estimates" actions={headerActions} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminLoadingSkeleton rows={1} variant="cards" />
          <AdminLoadingSkeleton rows={1} variant="cards" />
          <AdminLoadingSkeleton rows={1} variant="cards" />
          <AdminLoadingSkeleton rows={1} variant="cards" />
        </div>
        <AdminLoadingSkeleton rows={8} variant="table" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Payments" 
        description="Manage invoices and estimates" 
        actions={headerActions} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatsCard 
          icon={<DollarSign className="h-5 w-5 text-green-400" />}
          value={formatMAD(revenue)}
          label="Total Revenue"
        />
        <AdminStatsCard 
          icon={<AlertCircle className="h-5 w-5 text-orange-400" />}
          value={formatMAD(outstanding)}
          label="Outstanding"
        />
        <AdminStatsCard 
          icon={<CheckCircle className="h-5 w-5 text-blue-400" />}
          value={formatMAD(paidThisMonth)}
          label="Paid This Month"
        />
        <AdminStatsCard 
          icon={<FileText className="h-5 w-5 text-gray-400" />}
          value={draftCount}
          label="Draft Count"
        />
      </div>

      <div className="bg-glass border border-border-color rounded-xl overflow-hidden shadow-sm">
        <div className="flex border-b border-border-color px-4 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'invoices' 
                ? 'border-primary text-text-primary' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('estimates')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'estimates' 
                ? 'border-primary text-text-primary' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Estimates
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'invoices' ? (
            invoices.length === 0 ? (
              <AdminEmptyState 
                icon={<FileText className="h-12 w-12 text-gray-500" />}
                title="No Invoices Found"
                description="Create your first invoice to get started."
                action={
                  <Link to="/invoices/create" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors inline-block mt-4">
                    Create Invoice
                  </Link>
                }
              />
            ) : (
              <AdminDataTable 
                data={invoices} 
                columns={invoiceColumns} 
                bulkActions={getBulkActions('invoices')} 
                isLoading={loading}
              />
            )
          ) : (
            estimates.length === 0 ? (
              <AdminEmptyState 
                icon={<FileText className="h-12 w-12 text-gray-500" />}
                title="No Estimates Found"
                description="Create your first estimate to send to a client."
                action={
                  <Link to="/estimates/create" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors inline-block mt-4">
                    Create Estimate
                  </Link>
                }
              />
            ) : (
              <AdminDataTable 
                data={estimates} 
                columns={estimateColumns} 
                bulkActions={getBulkActions('estimates')}
                isLoading={loading}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
