import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../../components/icons/AddIcon';
import { EditIcon } from '../../components/icons/EditIcon';
import EditUserModal from '../../components/admin/EditUserModal';
import { User } from '../../types';

const AdminUsersPage: React.FC = () => {
    const { data, loading, error } = useData();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsEditModalOpen(false);
        setSelectedUser(null);
    };

    const handleSaveUser = (updatedUser: User) => {
        // This will be handled by the modal's internal logic
    };

    if (loading) return <div>Loading users...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Manage Users</h2>
                    <p className="text-text-secondary text-sm mt-1">Control user access, roles, and permissions.</p>
                </div>
                <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20">
                    <AddIcon className="h-4 w-4" />
                    Invite User
                </button>
            </div>

            <div className="bg-glass border border-border-color rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-glass-light border-b border-border-color">
                                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Name</th>
                                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Email</th>
                                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Role</th>
                                <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {data.users.map((user) => (
                                <tr key={user.id} className="hover:bg-glass-light/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                                            <span className="text-sm font-medium text-text-primary">{user.name || `${user.firstName} ${user.lastName}` || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-text-secondary">{user.email}</td>
                                    <td className="p-4 text-sm text-text-secondary">{user.role || 'client'}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleEditUser(user)} className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                                            <EditIcon className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {isEditModalOpen && selectedUser && (
                <EditUserModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseModal}
                    user={selectedUser}
                />
            )}
        </div>
    );
};

export default AdminUsersPage;
