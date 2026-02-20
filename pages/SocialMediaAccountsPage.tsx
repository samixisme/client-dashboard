import React, { useEffect, useState, useCallback } from 'react';
import { useSocialMediaStore } from '../stores/socialMediaStore';
import AccountsList from '../components/social-media/AccountsList';
import PlatformFilterBar from '../components/social-media/PlatformFilterBar';
import { connectPlatform, disconnectPlatform, refreshPlatformData } from '../utils/socialAuth';
import { exportAllData, ExportFormat } from '../utils/exportData';
import { SocialPlatform } from '../types';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';

const SocialMediaAccountsPage: React.FC = () => {
    const {
        accounts,
        posts,
        overviews,
        scheduledPosts,
        anomalies,
        filters,
        loading,
        error,
        setFilters,
        initListeners,
    } = useSocialMediaStore();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
    const [actionError, setActionError] = useState<string | null>(null);

    // Initialise Firestore real-time listeners and clean up on unmount
    useEffect(() => {
        const unsubscribes = initListeners();
        return () => {
            unsubscribes.forEach((unsub) => unsub());
        };
    }, [initListeners]);

    // Derive the accounts that match the active platform filter
    const filteredAccounts = filters.platforms.length === 0
        ? accounts
        : accounts.filter((acc) => filters.platforms.includes(acc.platform));

    const handleTogglePlatform = useCallback(
        (platform: SocialPlatform) => {
            const current = filters.platforms;
            const next = current.includes(platform)
                ? current.filter((p) => p !== platform)
                : [...current, platform];
            setFilters({ platforms: next });
        },
        [filters.platforms, setFilters]
    );

    const handleConnect = useCallback(async (platform: SocialPlatform) => {
        setActionError(null);
        try {
            await connectPlatform(platform);
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : `Failed to connect ${platform}`
            );
        }
    }, []);

    const handleDisconnect = useCallback(async (accountId: string) => {
        setActionError(null);
        try {
            await disconnectPlatform(accountId);
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : 'Failed to disconnect account'
            );
        }
    }, []);

    const handleRefresh = useCallback(async (accountId: string) => {
        setActionError(null);
        setIsRefreshing(true);
        try {
            const account = accounts.find((a) => a.id === accountId);
            if (!account) {
                throw new Error('Account not found');
            }
            await refreshPlatformData(accountId, account.platform);
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : 'Failed to refresh account data'
            );
        } finally {
            setIsRefreshing(false);
        }
    }, [accounts]);

    const handleExport = useCallback(() => {
        exportAllData(
            {
                accounts,
                posts,
                overview: overviews,
                scheduledPosts,
                anomalies,
            },
            exportFormat
        );
    }, [accounts, posts, overviews, scheduledPosts, anomalies, exportFormat]);

    const connectedCount = accounts.filter((a) => a.isConnected).length;
    const disconnectedCount = accounts.filter((a) => !a.isConnected).length;

    return (
        <div className="min-h-screen p-6 space-y-8">
            {/* Page header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">
                        Social Media Accounts
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Connect and manage your social media presence across all platforms
                    </p>
                </div>

                {/* Summary badges */}
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3 py-1.5 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 text-sm font-semibold">
                        {connectedCount} Connected
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-glass/40 text-gray-400 border border-white/10 text-sm font-semibold">
                        {disconnectedCount} Available
                    </span>
                </div>
            </div>

            {/* Error banners */}
            {(error || actionError) && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{actionError ?? error}</p>
                </div>
            )}

            {/* Controls panel */}
            <div className="bg-glass/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-5">
                {/* Platform filter */}
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                        Filter by Platform
                    </p>
                    <PlatformFilterBar
                        selectedPlatforms={filters.platforms}
                        onTogglePlatform={handleTogglePlatform}
                        showAll
                    />
                </div>

                {/* Export controls */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mr-1">
                        Export All Data
                    </p>

                    {/* Format toggle */}
                    <div className="flex items-center rounded-lg overflow-hidden border border-white/10">
                        {(['json', 'csv'] as ExportFormat[]).map((fmt) => (
                            <button
                                key={fmt}
                                onClick={() => setExportFormat(fmt)}
                                className={`
                                    px-4 py-2 text-sm font-medium transition-all duration-200
                                    ${exportFormat === fmt
                                        ? 'bg-lime-500/20 text-lime-400'
                                        : 'bg-glass/20 text-gray-400 hover:bg-glass/40 hover:text-white'
                                    }
                                `}
                            >
                                {fmt.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={accounts.length === 0}
                        className="
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                            bg-lime-500/20 text-lime-400 border border-lime-500/30
                            hover:bg-lime-500/30 transition-all duration-300
                            disabled:opacity-40 disabled:cursor-not-allowed
                        "
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>

                    {isRefreshing && (
                        <span className="flex items-center gap-2 text-sm text-gray-400">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Refreshing…
                        </span>
                    )}
                </div>
            </div>

            {/* Accounts grid */}
            <AccountsList
                accounts={filteredAccounts}
                loading={loading}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onRefresh={handleRefresh}
            />

            {/* No-results hint when filter active but nothing matches */}
            {!loading && accounts.length > 0 && filteredAccounts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-gray-400 text-lg">
                        No accounts match the selected platform filter.
                    </p>
                    <button
                        onClick={() => setFilters({ platforms: [] })}
                        className="mt-4 px-5 py-2.5 rounded-lg bg-glass/40 text-white border border-white/10 hover:bg-glass/60 transition-all duration-300 text-sm font-medium"
                    >
                        Clear Filter
                    </button>
                </div>
            )}
        </div>
    );
};

export default SocialMediaAccountsPage;
