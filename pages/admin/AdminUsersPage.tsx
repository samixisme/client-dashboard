import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Users, Shield, UserCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminApi } from '../../hooks/useAdminApi';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminStatsCard } from '../../components/admin/AdminStatsCard';
import { AdminDataTable, BulkAction } from '../../components/admin/AdminDataTable';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';
import { AdminLoadingSkeleton } from '../../components/admin/AdminLoadingSkeleton';
import { User } from '../../types';
import { useNovuTrigger } from '../../src/hooks/useNovuTrigger';
import { ActionsMenu, getRelativeTime } from '../../components/admin/users/UserActionsMenu';

export default function AdminUsersPage() {
    const { loading, get, patch, del, bulkDelete } = useAdminApi();
    const { trigger: novuTrigger } = useNovuTrigger();
    const [users, setUsers] = useState<User[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    const fetchUsers = useCallback(async () => {
        setIsFetching(true);
        try {
            const data = await get<User[]>('/users');
            if (data) {
                setUsers(data);
            }
        } catch {
            toast.error('Failed to load users');
        } finally {
            setIsFetching(false);
        }
    }, [get]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAction = useCallback(async (action: string, user: User) => {
        if (action === 'edit') {
            toast.info('Edit functionality not yet implemented');
        } else if (action === 'approve') {
            const originalStatus = user.status;
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'approved' } : u));
            try {
                await patch(`/users/${user.id}/status`, { status: 'approved' });
                novuTrigger({
                    workflowId: 'user-approved',
                    targetSubscriberId: user.id,
                    payload: { userName: user.name || user.email },
                });
                toast.success(`User ${user.name || user.email} approved`);
            } catch {
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: originalStatus } : u));
                toast.error('Failed to approve user');
            }
        } else if (action === 'disable') {
            const originalStatus = user.status;
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'disabled' } : u));
            try {
                await patch(`/users/${user.id}/status`, { status: 'disabled' });
                toast.success(`User ${user.name || user.email} disabled`);
            } catch {
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: originalStatus } : u));
                toast.error('Failed to disable user');
            }
        } else if (action === 'delete') {
            if (window.confirm('Are you sure you want to delete this user?')) {
                const previousUsers = [...users];
                setUsers(prev => prev.filter(u => u.id !== user.id));
                try {
                    await del(`/users/${user.id}`);
                    toast.success('User deleted successfully');
                } catch {
                    setUsers(previousUsers);
                    toast.error('Failed to delete user');
                }
            }
        }
    }, [patch, del, users]);

    const columns = useMemo<ColumnDef<User>[]>(() => [
        {
            id: 'avatar',
            header: 'Avatar',
            cell: ({ row }) => {
                const { avatarUrl, name, firstName, lastName } = row.original;
                const displayName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'User';
                const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                return avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {initials}
                    </div>
                );
            },
        },
        {
            id: 'name',
            header: 'Name',
            accessorFn: row => row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unknown',
            cell: ({ row, getValue }) => {
                const name = getValue() as string;
                const { email } = row.original;
                return (
                    <div>
                        <div className="font-semibold text-text-primary">{name}</div>
                        {email && <div className="text-sm text-text-secondary">{email}</div>}
                    </div>
                );
            },
        },
        {
            id: 'role',
            header: 'Role',
            accessorFn: row => row.role || 'client',
            cell: ({ getValue }) => {
                const role = getValue() as string;
                const badgeClass = role === 'admin'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-blue-500/10 text-blue-400';
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${badgeClass}`}>
                        {role}
                    </span>
                );
            },
        },
        {
            id: 'status',
            header: 'Status',
            accessorFn: row => row.status || 'pending',
            cell: ({ getValue }) => {
                const status = getValue() as string;
                let badgeClass = 'bg-yellow-500/10 text-yellow-400';
                if (status === 'approved') badgeClass = 'bg-green-500/10 text-green-400';
                if (status === 'disabled') badgeClass = 'bg-red-500/10 text-red-400';
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${badgeClass}`}>
                        {status}
                    </span>
                );
            },
        },
        {
            id: 'lastLogin',
            header: 'Last Login',
            accessorFn: row => row.lastLogin,
            cell: ({ getValue }) => (
                <span className="text-sm text-text-secondary">
                    {getRelativeTime(getValue() as string)}
                </span>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex justify-end pr-4">
                    <ActionsMenu user={row.original} onAction={handleAction} />
                </div>
            ),
        },
    ], [handleAction]);

    const bulkActions = useMemo<BulkAction[]>(() => [
        {
            label: 'Approve Selected',
            onClick: async (ids: string[]) => {
                const promises = ids.map(id => patch(`/users/${id}/status`, { status: 'approved' }));
                try {
                    await Promise.all(promises);
                    setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, status: 'approved' } : u));
                    toast.success(`${ids.length} users approved`);
                } catch {
                    toast.error('Failed to approve some users');
                    fetchUsers();
                }
            }
        },
        {
            label: 'Disable Selected',
            onClick: async (ids: string[]) => {
                const promises = ids.map(id => patch(`/users/${id}/status`, { status: 'disabled' }));
                try {
                    await Promise.all(promises);
                    setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, status: 'disabled' } : u));
                    toast.success(`${ids.length} users disabled`);
                } catch {
                    toast.error('Failed to disable some users');
                    fetchUsers();
                }
            }
        },
        {
            label: 'Delete Selected',
            variant: 'danger',
            onClick: async (ids: string[]) => {
                if (window.confirm(`Are you sure you want to delete ${ids.length} users?`)) {
                    try {
                        await bulkDelete('/users', ids);
                        setUsers(prev => prev.filter(u => !ids.includes(u.id)));
                        toast.success(`${ids.length} users deleted`);
                    } catch {
                        toast.error('Failed to delete some users');
                        fetchUsers();
                    }
                }
            }
        }
    ], [patch, bulkDelete, fetchUsers]);

    const stats = useMemo(() => ({
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        clients: users.filter(u => u.role === 'client' || !u.role).length,
        pending: users.filter(u => u.status === 'pending' || !u.status).length,
    }), [users]);

    if (isFetching && users.length === 0) {
        return (
            <div className="space-y-6">
                <AdminPageHeader title="User Management" description="Loading users..." />
                <AdminLoadingSkeleton variant="cards" />
                <AdminLoadingSkeleton variant="table" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="User Management"
                description="Manage user access, roles, and status across your platform."
                actions={
                    <button
                        onClick={() => toast.info('Add user functionality coming soon')}
                        className="bg-primary text-text-primary hover:bg-primary-hover px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Add User
                    </button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AdminStatsCard icon={<Users className="w-5 h-5 text-primary" />} value={stats.total.toString()} label="Total Users" />
                <AdminStatsCard icon={<Shield className="w-5 h-5 text-green-500" />} value={stats.admins.toString()} label="Admins" />
                <AdminStatsCard icon={<UserCheck className="w-5 h-5 text-blue-500" />} value={stats.clients.toString()} label="Clients" />
                <AdminStatsCard icon={<Clock className="w-5 h-5 text-yellow-500" />} value={stats.pending.toString()} label="Pending Approval" />
            </div>

            {users.length === 0 && !isFetching ? (
                <AdminEmptyState
                    icon={<Users className="w-12 h-12 text-text-secondary opacity-50" />}
                    title="No users found"
                    description="Get started by adding your first user to the platform."
                    action={
                        <button
                            onClick={() => toast.info('Add user functionality coming soon')}
                            className="bg-primary text-text-primary hover:bg-primary-hover px-4 py-2 rounded-lg font-medium transition-colors mt-4"
                        >
                            Add User
                        </button>
                    }
                />
            ) : (
                <AdminDataTable
                    data={users}
                    columns={columns}
                    bulkActions={bulkActions}
                    isLoading={isFetching}
                    totalCount={users.length}
                />
            )}
        </div>
    );
}
