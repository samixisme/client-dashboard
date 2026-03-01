import React, { useState, useEffect } from 'react';
import { Settings, Database, Shield, HardDrive, Users, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminApi } from '../../hooks/useAdminApi';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminLoadingSkeleton } from '../../components/admin/AdminLoadingSkeleton';
import { SettingsTabContent, TabId, SettingsData } from '../../components/admin/settings/SettingsTabContent';

export default function AdminSettingsPage() {
  const { get, post } = useAdminApi();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [data, setData] = useState<SettingsData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [appName, setAppName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [defaultStatusPending, setDefaultStatusPending] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await get<SettingsData>('/settings');
      if (res) {
        setData(res);
        setAppName(res.general.appName);
        setTimezone(res.general.timezone);
        setDefaultStatusPending(res.users.defaultStatusPending);
      } else {
        const mock: SettingsData = {
          general: { appName: 'Client Dashboard', timezone: 'UTC' },
          firebase: {
            status: 'connected',
            collectionStats: { users: 142, projects: 56, invoices: 89 },
            indexes: 12
          },
          security: { cors: 'https://app.example.com', rateLimit: '100 req/min' },
          users: { defaultStatusPending: true },
          notifications: { novuConnected: true }
        };
        setData(mock);
        setAppName(mock.general.appName);
        setTimezone(mock.general.timezone);
        setDefaultStatusPending(mock.users.defaultStatusPending);
      }
    } catch {
      toast.error('Failed to load settings');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await post('/settings', {
        general: { appName, timezone },
        users: { defaultStatusPending }
      });
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = async () => {
    if (!window.confirm('Are you sure you want to trigger a full Firestore backup?')) return;
    try {
      await post('/bulk/firestore/backup', {});
      toast.success('Backup triggered successfully');
    } catch {
      toast.error('Failed to trigger backup');
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('WARNING: This will overwrite current data. Are you sure you want to restore from the latest backup?')) return;
    try {
      await post('/bulk/firestore/restore', {});
      toast.success('Restore triggered successfully');
    } catch {
      toast.error('Failed to trigger restore');
    }
  };

  const rotateApiKey = async () => {
    if (!window.confirm('Are you sure? Existing API clients will lose access until updated.')) return;
    try {
      await post('/settings/rotate-api-key', {});
      toast.success('API key rotated successfully');
    } catch {
      toast.error('Failed to rotate API key');
    }
  };

  const tabs: { id: TabId; label: string; icon: React.FC<any> }[] = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'firebase', label: 'Firebase', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'backup', label: 'Backup / Restore', icon: HardDrive },
    { id: 'users', label: 'User Settings', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  if (!data) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Settings" description="Manage platform configuration" />
        <AdminLoadingSkeleton variant="cards" rows={1} />
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0"><AdminLoadingSkeleton variant="table" rows={7} /></div>
          <div className="flex-1"><AdminLoadingSkeleton variant="table" rows={10} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Settings" description="Manage platform configuration and integrations" />

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-glass border border-border-color text-primary'
                      : 'text-text-secondary hover:bg-glass hover:text-text-primary'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-text-secondary'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 min-w-0">
          <div className="bg-glass border border-border-color rounded-xl p-6 min-h-[500px]">
            <div className="transition-opacity duration-200">
              <SettingsTabContent
                activeTab={activeTab}
                data={data}
                appName={appName}
                onAppNameChange={setAppName}
                timezone={timezone}
                onTimezoneChange={setTimezone}
                defaultStatusPending={defaultStatusPending}
                onDefaultStatusPendingChange={setDefaultStatusPending}
                isSaving={isSaving}
                onSave={handleSave}
                onBackup={handleBackup}
                onRestore={handleRestore}
                onRotateApiKey={rotateApiKey}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
