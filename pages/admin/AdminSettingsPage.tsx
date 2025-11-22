import React from 'react';

const AdminSettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
        <div>
            <h2 className="text-2xl font-bold text-text-primary">Global Settings</h2>
            <p className="text-text-secondary text-sm mt-1">Configure application-wide preferences and defaults.</p>
        </div>
         <div className="bg-glass border border-border-color rounded-xl p-10 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 rounded-full bg-glass-light flex items-center justify-center mb-4">
                <span className="text-2xl">⚙️</span>
             </div>
             <h3 className="text-lg font-semibold text-text-primary">System Settings</h3>
             <p className="text-text-secondary max-w-md mt-2">
                 Advanced configuration options for the application will be housed here.
             </p>
        </div>
    </div>
  );
};

export default AdminSettingsPage;
