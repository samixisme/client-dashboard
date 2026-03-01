import React from 'react';
import { motion } from 'framer-motion';
import {
  Save, RefreshCw, Upload, Download,
  AlertTriangle, CheckCircle2, XCircle, Bell, Database
} from 'lucide-react';
import { AdminStatsCard } from '../AdminStatsCard';

export type TabId = 'general' | 'firebase' | 'security' | 'backup' | 'users' | 'notifications';

export interface SettingsData {
  general: { appName: string; timezone: string };
  firebase: { status: 'connected' | 'error'; collectionStats: Record<string, number>; indexes: number };
  security: { cors: string; rateLimit: string };
  users: { defaultStatusPending: boolean };
  notifications: { novuConnected: boolean };
}

interface SettingsTabContentProps {
  activeTab: TabId;
  data: SettingsData;
  appName: string;
  onAppNameChange: (v: string) => void;
  timezone: string;
  onTimezoneChange: (v: string) => void;
  defaultStatusPending: boolean;
  onDefaultStatusPendingChange: (v: boolean) => void;
  isSaving: boolean;
  onSave: () => void;
  onBackup: () => void;
  onRestore: () => void;
  onRotateApiKey: () => void;
}

const animationProps = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
};

const SaveButton = ({ isSaving, onClick }: { isSaving: boolean; onClick: () => void }) => (
  <div className="pt-4">
    <button
      onClick={onClick}
      disabled={isSaving}
      className="flex items-center gap-2 bg-primary text-text-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
    >
      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      Save Changes
    </button>
  </div>
);

export const SettingsTabContent: React.FC<SettingsTabContentProps> = ({
  activeTab, data, appName, onAppNameChange, timezone, onTimezoneChange,
  defaultStatusPending, onDefaultStatusPendingChange, isSaving, onSave,
  onBackup, onRestore, onRotateApiKey,
}) => {
  switch (activeTab) {
    case 'general':
      return (
        <motion.div key="general" {...animationProps} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-text-primary mb-4">General Settings</h3>
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Application Name</label>
                <input
                  type="text"
                  value={appName}
                  onChange={e => onAppNameChange(e.target.value)}
                  className="w-full bg-glass-light border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Default Timezone</label>
                <select
                  value={timezone}
                  onChange={e => onTimezoneChange(e.target.value)}
                  className="w-full bg-glass-light border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Logo</label>
                <div className="border-2 border-dashed border-border-color rounded-lg p-6 flex flex-col items-center justify-center text-text-secondary hover:bg-glass-light hover:text-text-primary transition-colors cursor-pointer">
                  <Upload className="w-6 h-6 mb-2" />
                  <span className="text-sm">Click to upload logo (PNG, JPG)</span>
                </div>
              </div>
            </div>
          </div>
          <SaveButton isSaving={isSaving} onClick={onSave} />
        </motion.div>
      );

    case 'firebase':
      return (
        <motion.div key="firebase" {...animationProps} className="space-y-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Firebase Configuration</h3>
          <div className="flex items-center gap-4 p-4 bg-glass-light border border-border-color rounded-lg">
            <div className={`p-2 rounded-full ${data.firebase.status === 'connected' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {data.firebase.status === 'connected' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            </div>
            <div>
              <h4 className="font-medium text-text-primary">Connection Status</h4>
              <p className="text-sm text-text-secondary">{data.firebase.status === 'connected' ? 'Connected to Firebase project' : 'Connection error'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {Object.entries(data.firebase.collectionStats).map(([collection, count]) => (
              <AdminStatsCard
                key={collection}
                icon={<Database className="w-5 h-5" />}
                value={count}
                label={`${collection.charAt(0).toUpperCase() + collection.slice(1)}`}
              />
            ))}
            <AdminStatsCard icon={<Database className="w-5 h-5" />} value={data.firebase.indexes} label="Active Indexes" />
          </div>
        </motion.div>
      );

    case 'security':
      return (
        <motion.div key="security" {...animationProps} className="space-y-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Security Settings</h3>
          <div className="space-y-6 max-w-2xl">
            <div className="bg-glass-light border border-border-color rounded-lg p-5">
              <h4 className="font-medium text-text-primary mb-2">API Key Rotation</h4>
              <p className="text-sm text-text-secondary mb-4">
                Rotate the primary API key used for external service authentication. This will immediately invalidate the old key.
              </p>
              <button
                onClick={onRotateApiKey}
                className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg font-medium hover:bg-red-500/20 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Rotate API Key
              </button>
            </div>
            <div className="bg-glass-light border border-border-color rounded-lg p-5">
              <h4 className="font-medium text-text-primary mb-4">Network Security</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Allowed CORS Origins</label>
                  <input type="text" readOnly value={data.security.cors} className="w-full bg-glass border border-border-color rounded-lg px-4 py-2 text-text-primary opacity-70 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Rate Limiting</label>
                  <input type="text" readOnly value={data.security.rateLimit} className="w-full bg-glass border border-border-color rounded-lg px-4 py-2 text-text-primary opacity-70 cursor-not-allowed" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      );

    case 'backup':
      return (
        <motion.div key="backup" {...animationProps} className="space-y-6 max-w-2xl">
          <h3 className="text-lg font-medium text-text-primary mb-4">Backup & Restore</h3>
          <div className="grid gap-6">
            <div className="bg-glass-light border border-border-color rounded-lg p-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400"><Download className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-medium text-text-primary">Create Backup</h4>
                  <p className="text-sm text-text-secondary mt-1 mb-4">
                    Create a complete snapshot of the Firestore database. This action runs asynchronously.
                  </p>
                  <button onClick={onBackup} className="px-4 py-2 bg-glass border border-border-color text-text-primary rounded-lg font-medium hover:bg-glass-light transition-colors">
                    Run Backup
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-glass-light border border-red-500/20 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-500/10 text-red-400"><AlertTriangle className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-medium text-red-400">Restore from Backup</h4>
                  <p className="text-sm text-text-secondary mt-1 mb-4">
                    Restore the database from the most recent backup. Warning: This will overwrite all current data.
                  </p>
                  <button onClick={onRestore} className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/20 transition-colors">
                    Restore Database
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      );

    case 'users':
      return (
        <motion.div key="users" {...animationProps} className="space-y-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">User Settings</h3>
          <div className="bg-glass-light border border-border-color rounded-lg p-5 max-w-xl flex items-center justify-between">
            <div>
              <h4 className="font-medium text-text-primary">Default Signup Status</h4>
              <p className="text-sm text-text-secondary mt-1">Require manual admin approval for new user signups.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={defaultStatusPending} onChange={e => onDefaultStatusPendingChange(e.target.checked)} />
              <div className="w-11 h-6 bg-glass border border-border-color peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <SaveButton isSaving={isSaving} onClick={onSave} />
        </motion.div>
      );

    case 'notifications':
      return (
        <motion.div key="notifications" {...animationProps} className="space-y-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Notifications</h3>
          <div className="flex items-center gap-4 p-4 bg-glass-light border border-border-color rounded-lg max-w-xl">
            <div className={`p-2 rounded-full ${data.notifications.novuConnected ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
              <Bell className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-text-primary">Novu Integration</h4>
              <p className="text-sm text-text-secondary">{data.notifications.novuConnected ? 'Connected to Novu API' : 'Not configured'}</p>
            </div>
            {data.notifications.novuConnected && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">Active</span>
            )}
          </div>
        </motion.div>
      );
  }
};
