import React from 'react';
import { AddIcon } from '../../components/icons/AddIcon';

const AdminUsersPage: React.FC = () => {
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
         <div className="bg-glass border border-border-color rounded-xl p-10 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 rounded-full bg-glass-light flex items-center justify-center mb-4">
                <span className="text-2xl">👥</span>
             </div>
             <h3 className="text-lg font-semibold text-text-primary">User Management Module</h3>
             <p className="text-text-secondary max-w-md mt-2">
                 User administration features will be available here. You'll be able to manage accounts, approve registrations, and set roles.
             </p>
        </div>
    </div>
  );
};

export default AdminUsersPage;
