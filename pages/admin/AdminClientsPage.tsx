import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Building2, CreditCard, Link2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminApi } from '../../hooks/useAdminApi';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminStatsCard } from '../../components/admin/AdminStatsCard';
import { AdminDataTable } from '../../components/admin/AdminDataTable';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';
import { AdminLoadingSkeleton } from '../../components/admin/AdminLoadingSkeleton';
import EditClientModal from '../../components/clients/EditClientModal';
import { useData } from '../../contexts/DataContext';
import { Client } from '../../types';

export default function AdminClientsPage() {
  const { data } = useData();
  const { users } = data;
  const { get, del, bulkDelete } = useAdminApi();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await get<Client[]>('/clients');
      if (response) {
        setClients(response);
      }
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      const success = await del(`/clients/${id}`);
      if (success) {
        toast.success('Client deleted successfully');
        setClients(prev => prev.filter(c => c.id !== id));
      }
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const getUserDisplay = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return userId;
    return user.email || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || userId;
  }, [users]);

  const columns = useMemo<ColumnDef<Client>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-bold text-text-primary">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'ice',
      header: 'ICE',
      cell: ({ row }) => row.original.ice || '—',
    },
    {
      accessorKey: 'rc',
      header: 'RC',
      cell: ({ row }) => row.original.rc || '—',
    },
    {
      accessorKey: 'if',
      header: 'IF',
      cell: ({ row }) => row.original.if || '—',
    },
    {
      accessorKey: 'adresse',
      header: 'Address',
      cell: ({ row }) => (
        <div className="max-w-[250px]">
          <div className="truncate text-text-primary" title={row.original.adresse}>
            {row.original.adresse || '—'}
          </div>
          {row.original.adresse2 && (
            <div className="text-xs text-text-secondary truncate mt-0.5" title={row.original.adresse2}>
              {row.original.adresse2}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'userId',
      header: 'Linked User',
      cell: ({ row }) => {
        const userId = row.original.userId;
        if (!userId) {
          return <span className="text-text-secondary">None</span>;
        }
        return <span className="text-text-primary">{getUserDisplay(userId)}</span>;
      },
    },
    {
      accessorKey: 'paymenterUserId',
      header: 'Paymenter ID',
      cell: ({ row }) => {
        const pId = row.original.paymenterUserId;
        return pId ? (
          <span className="text-text-primary">{pId}</span>
        ) : (
          <span className="text-text-secondary">—</span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingClient(row.original)}
            className="p-1.5 text-text-secondary hover:text-primary hover:bg-glass-light rounded-md transition-colors"
            title="Edit Client"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteClient(row.original.id)}
            className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-glass-light rounded-md transition-colors"
            title="Delete Client"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [handleDeleteClient, getUserDisplay]);

  const bulkActions = useMemo(() => [
    {
      label: 'Delete Selected',
      variant: 'danger' as const,
      onClick: async (selectedIds: string[]) => {
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected clients?`)) return;
        try {
          const success = await bulkDelete('/clients', selectedIds);
          if (success) {
            toast.success(`Successfully deleted ${selectedIds.length} clients`);
            setClients(prev => prev.filter(c => !selectedIds.includes(c.id)));
          }
        } catch (error) {
          toast.error('Failed to delete selected clients');
        }
      }
    }
  ], [bulkDelete]);

  if (loading && clients.length === 0) {
    return (
      <div className="space-y-6">
        <AdminPageHeader 
          title="Client Management" 
          description="Manage your client companies and contact information." 
        />
        <AdminLoadingSkeleton variant="cards" rows={1} />
        <AdminLoadingSkeleton variant="table" rows={5} />
      </div>
    );
  }

  const stats = {
    total: clients.length,
    withPaymenter: clients.filter(c => !!c.paymenterUserId).length,
    activeUsers: clients.filter(c => !!c.userId).length
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Client Management"
        description="Manage your client companies and contact information."
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-primary text-text-primary text-sm font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-colors"
          >
            Add Client
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminStatsCard
          icon={<Building2 className="w-5 h-5 text-primary" />}
          value={stats.total}
          label="Total Clients"
        />
        <AdminStatsCard
          icon={<CreditCard className="w-5 h-5 text-green-400" />}
          value={stats.withPaymenter}
          label="With Paymenter Link"
        />
        <AdminStatsCard
          icon={<Link2 className="w-5 h-5 text-blue-400" />}
          value={stats.activeUsers}
          label="Active Users Linked"
        />
      </div>

      {clients.length === 0 && !loading ? (
        <AdminEmptyState
          icon={<Building2 className="w-12 h-12 text-text-secondary" />}
          title="No clients yet"
          description="Create your first client to get started."
          action={
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-primary text-text-primary text-sm font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-colors"
            >
              Add Client
            </button>
          }
        />
      ) : (
        <AdminDataTable
          data={clients}
          columns={columns}
          bulkActions={bulkActions}
          isLoading={loading}
        />
      )}

      {isAddModalOpen && (
        <EditClientModal
          onClose={() => {
            setIsAddModalOpen(false);
            fetchClients();
          }}
        />
      )}

      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => {
            setEditingClient(null);
            fetchClients();
          }}
        />
      )}
    </div>
  );
}