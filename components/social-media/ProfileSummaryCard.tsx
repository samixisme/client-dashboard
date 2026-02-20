import React, { useState } from 'react';
import { SocialAccount, SocialPlatform } from '../../types';
import { Users, UserPlus, FileText, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Instagram, Twitter, Facebook, Linkedin, Music, Youtube } from 'lucide-react';
import { checkLoginState, statusChangeCallback } from '../../utils/socialAuth';

interface ProfileSummaryCardProps {
  account: SocialAccount;
  onConnect?: (platform: SocialPlatform) => void;
  onDisconnect?: (accountId: string) => void;
  onRefresh?: (accountId: string) => void;
}

const platformIcons: Record<SocialPlatform, { icon: React.ReactNode; color: string }> = {
  instagram: { icon: <Instagram className="h-6 w-6" />, color: '#E1306C' },
  twitter:   { icon: <Twitter  className="h-6 w-6" />, color: '#1DA1F2' },
  facebook:  { icon: <Facebook className="h-6 w-6" />, color: '#1877F2' },
  linkedin:  { icon: <Linkedin className="h-6 w-6" />, color: '#0A66C2' },
  tiktok:    { icon: <Music    className="h-6 w-6" />, color: '#000000' },
  youtube:   { icon: <Youtube  className="h-6 w-6" />, color: '#FF0000' },
};

const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({
  account,
  onConnect,
  onDisconnect,
  onRefresh,
}) => {
  const { icon, color } = platformIcons[account.platform];
  const timeSinceSync = account.lastSynced
    ? new Date(account.lastSynced).toLocaleString()
    : 'Never';

  // Tracks FB login-check in progress so we can show a spinner on the button
  const [fbChecking, setFbChecking] = useState(false);
  // Transient status label shown under the FB button after a check
  const [fbStatus, setFbStatus] = useState<string | null>(null);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000)    return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // ─── Step 4: Facebook Login Button handler ──────────────────────────────
  // Mirrors Meta's guide pattern:
  //   <fb:login-button onlogin="checkLoginState();">
  //   function checkLoginState() {
  //     FB.getLoginStatus(function(response) { statusChangeCallback(response); });
  //   }
  //
  // For Facebook cards we first run checkLoginState() (Step 3 status check).
  // If 'connected' → user already authorized → proceed directly.
  // Otherwise → trigger the full connectPlatform OAuth flow (Step 4 popup).
  const handleFacebookLoginButton = () => {
    setFbChecking(true);
    setFbStatus(null);

    // This is the Step 4 checkLoginState() call — wired to the button click
    // exactly as <fb:login-button onlogin="checkLoginState()"> would do.
    checkLoginState((response) => {
      const result = statusChangeCallback(response);

      if (result.isConnected) {
        // Already connected — propagate upward so the page can store the token
        setFbStatus('Already connected — syncing…');
        setFbChecking(false);
        onConnect?.(account.platform);
      } else {
        // Not authorized or unknown → show the full FB.login() popup via connectPlatform
        setFbStatus(
          result.status === 'not_authorized'
            ? 'Authorization required — opening Facebook…'
            : 'Opening Facebook login…'
        );
        setFbChecking(false);
        onConnect?.(account.platform);
      }
    });
  };

  // ─── Connect button renderer ──────────────────────────────────────────────
  const renderConnectButton = () => {
    // Facebook uses the Step 4 login-button pattern
    if (account.platform === 'facebook') {
      return (
        <div className="flex flex-col gap-1.5 w-full">
          {/* The Facebook Login Button — styled to match our dark glassmorphic theme */}
          <button
            onClick={handleFacebookLoginButton}
            disabled={fbChecking}
            className="
              flex-1 w-full px-4 py-2.5 rounded-lg text-sm font-semibold
              flex items-center justify-center gap-2
              transition-all duration-300
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            style={{
              backgroundColor: fbChecking ? 'rgba(24,119,242,0.15)' : 'rgba(24,119,242,0.2)',
              color: '#1877F2',
              border: '1px solid rgba(24,119,242,0.35)',
            }}
            // data-onlogin mirrors the FB XFBML attribute for documentation clarity
            data-onlogin="checkLoginState()"
          >
            {fbChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Facebook className="h-4 w-4" />
            )}
            {fbChecking ? 'Checking…' : 'Continue with Facebook'}
          </button>

          {/* Status feedback line — shown after checkLoginState runs */}
          {fbStatus && (
            <p className="text-xs text-center text-gray-400 animate-pulse px-1">
              {fbStatus}
            </p>
          )}
        </div>
      );
    }

    // All other platforms — plain connect button
    return (
      <button
        onClick={() => onConnect?.(account.platform)}
        className="flex-1 px-4 py-2 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 hover:bg-lime-500/30 transition-all duration-300 text-sm font-medium"
      >
        Connect Account
      </button>
    );
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 p-6 hover:bg-glass/60 transition-all duration-300 group hover:shadow-xl"
      style={{
        boxShadow: account.isConnected ? `0 8px 16px ${color}15` : undefined,
      }}
    >
      {/* Platform color accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />

      {/* Header: avatar + platform icon */}
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
        <div className="p-2 rounded-lg bg-black/40 backdrop-blur-sm" style={{ color }}>
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
          renderConnectButton()
        )}
      </div>

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

export default ProfileSummaryCard;
