
import React, { useState, useMemo } from 'react';
import { useSearch } from '../../contexts/SearchContext';
import { useData } from '../../contexts/DataContext';
import { Client } from '../../types';
import EditClientModal from '../../components/clients/EditClientModal';

const AdminClientsPage = () => {
    const { searchQuery } = useSearch();
    const { data, updateData } = useData();
    const { clients } = data;
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.adresse.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.ice.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.rc.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.if.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [clients, searchQuery]);

    const handleAddClient = (client: Client) => {
        const newClients = [...clients, client];
        updateData('clients', newClients);
        setIsAddModalOpen(false);
    };

    const handleEditClient = (updatedClient: Client) => {
        const updatedClients = clients.map(c =>
            c.id === updatedClient.id ? updatedClient : c
        );
        updateData('clients', updatedClients);
        setEditingClient(null);
    };

    const handleDeleteClient = (clientId: string) => {
        if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            const updatedClients = clients.filter(c => c.id !== clientId);
            updateData('clients', updatedClients);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Client Management</h1>
                    <p className="mt-2 text-text-secondary">Manage your client companies and contact information.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-primary text-text-primary text-sm font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary"
                >
                    Add New Client
                </button>
            </div>

            <div className="mt-8 bg-glass rounded-lg border border-border-color overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-color">
                        <thead className="bg-glass-light">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Address</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">ICE</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">RC</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">IF</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                                        No clients found. {searchQuery ? 'Try a different search.' : 'Add your first client to get started.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-glass-light">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{client.name}</td>
                                        <td className="px-6 py-4 text-sm text-text-secondary">
                                            <div>{client.adresse}</div>
                                            {client.adresse2 && <div className="text-xs">{client.adresse2}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{client.ice || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{client.rc || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{client.if || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setEditingClient(client)}
                                                    className="px-3 py-1 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClient(client.id)}
                                                    className="px-3 py-1 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isAddModalOpen && (
                <EditClientModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={handleAddClient}
                />
            )}

            {editingClient && (
                <EditClientModal
                    client={editingClient}
                    onClose={() => setEditingClient(null)}
                    onSave={handleEditClient}
                />
            )}
        </div>
    );
};

export default AdminClientsPage;
