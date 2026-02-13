import React from 'react';
import { SocialAccount, SocialPlatform } from '../../types';
import { Users, UserPlus, FileText, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Instagram, Twitter, Facebook, Linkedin, Music, Youtube } from 'lucide-react';

interface ProfileSummaryCardProps {
  account: SocialAccount;
  onConnect?: (platform: SocialPlatform) => void;
  onDisconnect?: (accountId: string) => void;
  onRefresh?: (accountId: string) => void;
}

const platformIcons: Record<SocialPlatform, { icon: React.ReactNode; color: string }> = {
  instagram: { icon: <Instagram className="h-6 w-6" />, color: '#E1306C' },
  twitter: { icon: <Twitter className="h-6 w-6" />, color: '#1DA1F2' },
  facebook: { icon: <Facebook className="h-6 w-6" />, color: '#1877F2' },
  linkedin: { icon: <Linkedin className="h-6 w-6" />, color: '#0A66C2' },
  tiktok: { icon: <Music className="h-6 w-6" />, color: '#000000' },
  youtube: { icon: <Youtube className="h-6 w-6" />, color: '#FF0000' },
};

const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({
  account,
  onConnect,
  onDisconnect,
  onRefresh,
}) => {
  const { icon, color } = platformIcons[account.platform];
  const timeSinceSync = account.lastSynced ? new Date(account.lastSynced).toLocaleString() : 'Never';

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 p-6 hover:bg-glass/60 transition-all duration-300 group hover:shadow-xl"
      style={{
        boxShadow: account.isConnected ? `0 8px 16px ${color}15` : undefined,
      }}
    >
      {/* Platform color accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: color }}
      />

      {/* Header with avatar and platform icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <img
              src={account.avatarUrl}
              alt={account.displayName}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-4 group-hover:ring-lime-500/30 transition-all duration-300"
            />
            {/* Connection status badge */}
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-black/80 backdrop-blur-sm">
              {account.isConnected ? (
                <CheckCircle className="h-4 w-4 text-lime-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
            </div>
          </div>

          {/* Name and handle */}
          <div>
            <h3 className="font-semibold text-white text-lg">{account.displayName}</h3>
            <p className="text-sm text-gray-400">@{account.handle}</p>
          </div>
        </div>

        {/* Platform icon */}
        <div
          className="p-2 rounded-lg bg-black/40 backdrop-blur-sm"
          style={{ color }}
        >
          {icon}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(account.followers)}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Followers</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <UserPlus className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(account.following)}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Following</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(account.posts)}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Posts</p>
        </div>
      </div>

      {/* Last synced */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-white/10">
        <span>Last synced:</span>
        <span className="text-gray-400">{timeSinceSync}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {account.isConnected ? (
          <>
            <button
              onClick={() => onRefresh?.(account.id)}
              className="flex-1 px-4 py-2 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 hover:bg-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => onDisconnect?.(account.id)}
              className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all duration-300 text-sm font-medium"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              console.log('🟡 Connect Account button clicked for platform:', account.platform);
              onConnect?.(account.platform);
            }}
            className="flex-1 px-4 py-2 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 hover:bg-lime-500/30 transition-all duration-300 text-sm font-medium"
          >
            Connect Account
          </button>
        )}
      </div>

      {/* Hover glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

export default ProfileSummaryCard;
