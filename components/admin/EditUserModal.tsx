import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Client } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useData } from '../../contexts/DataContext';
import { toast } from 'sonner';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user }) => {
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [groupsInput, setGroupsInput] = useState('');
  const modalRoot = document.getElementById('modal-root');
  const { data } = useData();

  useEffect(() => {
    if (isOpen) {
      setEditedUser(user);
      setGroupsInput((user.groups || []).join(', '));
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, user]);

  const handleUpdate = (field: keyof User, value: unknown) => {
    setEditedUser(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', user.id);

      // Parse groups from comma-separated input
      const groups = groupsInput
        .split(',')
        .map(g => g.trim())
        .filter(g => g.length > 0);

      const dataToUpdate = {
        ...editedUser,
        name: `${editedUser.firstName} ${editedUser.lastName}`.trim(),
        groups: groups.length > 0 ? groups : undefined,
        // Clear clientId if user is admin
        clientId: editedUser.role === 'admin' ? undefined : editedUser.clientId
      };

      await updateDoc(userRef, dataToUpdate);
      toast.success('User updated successfully');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !modalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-glass border border-border-color rounded-xl shadow-xl w-full max-w-lg flex flex-col">
        <form onSubmit={handleSubmit} className="p-8 flex flex-col flex-grow">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Edit User</h2>
          
          {error && <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-lg text-sm mb-4">{error}</div>}

          <div className="space-y-4">
            <input type="text" placeholder="First Name" value={editedUser.firstName || ''} onChange={e => handleUpdate('firstName', e.target.value)} className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary" />
            <input type="text" placeholder="Last Name" value={editedUser.lastName || ''} onChange={e => handleUpdate('lastName', e.target.value)} className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary" />
            <input type="email" placeholder="Email" value={editedUser.email || ''} className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary" disabled />

            <select value={editedUser.role || 'client'} onChange={e => handleUpdate('role', e.target.value)} className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary">
              <option value="admin">Admin</option>
              <option value="client">Client</option>
            </select>

            {/* Client Assignment - Only show for non-admin users */}
            {editedUser.role !== 'admin' && (
              <div>
                <label className="block text-xs text-text-secondary mb-1">Assign to Client (Optional)</label>
                <select
                  value={editedUser.clientId || ''}
                  onChange={e => handleUpdate('clientId', e.target.value || undefined)}
                  className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="">-- No Client --</option>
                  {(data.clients || []).map((client: Client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Groups Management */}
            <div>
              <label className="block text-xs text-text-secondary mb-1">Groups (comma-separated, optional)</label>
              <input
                type="text"
                placeholder="e.g., Designers, Marketing, Team A"
                value={groupsInput}
                onChange={e => setGroupsInput(e.target.value)}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-text-secondary mt-1">Separate multiple groups with commas</p>
            </div>
          </div>
          
          <div className="flex justify-end items-center gap-4 pt-6 mt-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {isLoading ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    modalRoot
  );
};

export default EditUserModal;
