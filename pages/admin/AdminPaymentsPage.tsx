import React from 'react';

const AdminPaymentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
        <div>
            <h2 className="text-2xl font-bold text-text-primary">Payments & Invoices</h2>
            <p className="text-text-secondary text-sm mt-1">Track revenue, manage subscriptions, and handle invoices.</p>
        </div>
         <div className="bg-glass border border-border-color rounded-xl p-10 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 rounded-full bg-glass-light flex items-center justify-center mb-4">
                <span className="text-2xl">💳</span>
             </div>
             <h3 className="text-lg font-semibold text-text-primary">Financial Dashboard</h3>
             <p className="text-text-secondary max-w-md mt-2">
                 Comprehensive financial overview and payment management tools coming soon.
             </p>
        </div>
    </div>
  );
};

export default AdminPaymentsPage;
