import React from 'react';
import { GlobalLogoIcon } from '../components/icons/GlobalLogoIcon';
import { auth } from '../utils/firebase';

interface PendingApprovalPageProps {
  onLogout: () => void;
}

const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({ onLogout }) => {
  const handleLogout = () => {
    auth.signOut().then(() => {
      onLogout();
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-10 space-y-8 bg-glass rounded-2xl shadow-lg border border-border-color">
        <div className="flex flex-col items-center">
          <GlobalLogoIcon className="h-12 w-auto text-primary" />
          <h2 className="mt-4 text-3xl font-bold text-center text-text-primary">
            Account Pending Approval
          </h2>
          <p className="mt-2 text-sm text-center text-text-secondary">
            Thank you for signing up! Your account is currently under review by an administrator.
          </p>
          <div className="mt-6 text-center">
            <p className="text-text-secondary mb-4">
              You will receive an email once your account has been activated.
            </p>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-primary hover:text-primary-hover focus:outline-none"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
