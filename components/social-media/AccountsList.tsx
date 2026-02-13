import React from 'react';
import ProfileSummaryCard from './ProfileSummaryCard';
import { SocialAccount, SocialPlatform } from '../../types';
import { Plus } from 'lucide-react';

interface AccountsListProps {
  accounts: SocialAccount[];
  onConnect?: (platform: SocialPlatform) => void;
  onDisconnect?: (accountId: string) => void;
  onRefresh?: (accountId: string) => void;
  loading?: boolean;
}

const AccountsList: React.FC<AccountsListProps> = ({
  accounts,
  onConnect,
  onDisconnect,
  onRefresh,
  loading = false,
}) => {
  const connectedAccounts = accounts.filter(acc => acc.isConnected);
  const disconnectedAccounts = accounts.filter(acc => !acc.isConnected);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-80 rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Connected accounts */}
      {connectedAccounts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Connected Accounts</h3>
            <div className="px-3 py-1 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 text-sm font-semibold">
              {connectedAccounts.length} Active
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connectedAccounts.map((account, idx) => (
              <div
                key={account.id}
                style={{
                  animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
                }}
              >
                <ProfileSummaryCard
                  account={account}
                  onConnect={onConnect}
                  onDisconnect={onDisconnect}
                  onRefresh={onRefresh}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disconnected accounts / Add new */}
      {disconnectedAccounts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Available Platforms</h3>
            <p className="text-sm text-gray-400">Connect to start tracking</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disconnectedAccounts.map((account, idx) => (
              <div
                key={account.id}
                style={{
                  animation: `fadeInUp 0.6s ease-out ${(connectedAccounts.length + idx) * 0.1}s both`,
                }}
              >
                <ProfileSummaryCard
                  account={account}
                  onConnect={onConnect}
                  onDisconnect={onDisconnect}
                  onRefresh={onRefresh}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-glass/40 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-6">
            <Plus className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No Accounts Yet</h3>
          <p className="text-gray-400 max-w-md mb-6">
            Connect your social media accounts to start tracking your performance and engagement across all platforms.
          </p>
          <button
            onClick={() => {
              console.log('🟡 Empty state - Connect First Account clicked');
              alert('Please refresh the page. Social media accounts are being loaded from the database.');
              window.location.reload();
            }}
            className="px-6 py-3 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 hover:bg-lime-500/30 transition-all duration-300 font-semibold flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Refresh Page
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountsList;
