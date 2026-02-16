import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../../components/icons/AddIcon';
import { EditIcon } from '../../components/icons/EditIcon';
import { DeleteIcon } from '../../components/icons/DeleteIcon';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { SocialAccount, SocialPost, ScheduledPost, SocialAnomaly, SocialPlatform } from '../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';

type TabType = 'accounts' | 'posts' | 'scheduled' | 'anomalies';

const AdminSocialMediaPage: React.FC = () => {
  const { data, loading, error } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all');

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const socialAccounts = data.socialAccounts || [];
  const socialPosts = data.socialPosts || [];
  const scheduledPosts = data.scheduledPosts || [];
  const socialAnomalies = data.socialAnomalies || [];

  const platforms: SocialPlatform[] = ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube'];

  const handleAddAccount = () => {
    setSelectedItem(null);
    setIsAddEditModalOpen(true);
  };

  const handleEditAccount = (account: SocialAccount) => {
    setSelectedItem(account);
    setIsAddEditModalOpen(true);
  };

  const handleSchedulePost = () => {
    setSelectedItem(null);
    setIsScheduleModalOpen(true);
  };

  const handleDeleteItem = (item: any) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsProcessing(true);
    try {
      let collectionName = '';
      if (activeTab === 'accounts') collectionName = 'social_accounts';
      else if (activeTab === 'posts') collectionName = 'social_posts';
      else if (activeTab === 'scheduled') collectionName = 'scheduled_posts';
      else if (activeTab === 'anomalies') collectionName = 'social_anomalies';

      await deleteDoc(doc(db, collectionName, itemToDelete.id));
      toast.success(`${activeTab.slice(0, -1)} deleted`);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err) {
      console.error("Error deleting item: ", err);
      toast.error('Failed to delete item');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPlatformColor = (platform: SocialPlatform) => {
    switch (platform) {
      case 'instagram': return 'text-pink-500 bg-pink-500/10 border-pink-500/20';
      case 'twitter': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'facebook': return 'text-blue-600 bg-blue-600/10 border-blue-600/20';
      case 'linkedin': return 'text-blue-700 bg-blue-700/10 border-blue-700/20';
      case 'tiktok': return 'text-black bg-black/10 border-black/20';
      case 'youtube': return 'text-red-600 bg-red-600/10 border-red-600/20';
      default: return 'text-text-secondary bg-glass border-border-color';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-600/10 border-red-600/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-text-secondary bg-glass border-border-color';
    }
  };

  const filteredAccounts = socialAccounts.filter(account => {
    const matchesSearch = account.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || account.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const filteredPosts = socialPosts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || post.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const filteredScheduled = scheduledPosts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || post.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const filteredAnomalies = socialAnomalies.filter(anomaly => {
    const matchesPlatform = platformFilter === 'all' || anomaly.platform === platformFilter;
    return matchesPlatform;
  });

  if (loading) return <div>Loading social media data...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Manage Social Media</h2>
          <p className="text-text-secondary text-sm mt-1">Manage social accounts, posts, scheduling, and analytics.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'accounts' && (
            <button
              onClick={handleAddAccount}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <AddIcon className="h-4 w-4" />
              Connect Account
            </button>
          )}
          {activeTab === 'scheduled' && (
            <button
              onClick={handleSchedulePost}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <AddIcon className="h-4 w-4" />
              Schedule Post
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-glass border border-border-color rounded-xl p-1 flex gap-1">
        {(['accounts', 'posts', 'scheduled', 'anomalies'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-glass-light'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-glass border border-border-color rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
        <input
          type="text"
          placeholder="Search..."
          className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setPlatformFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              platformFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-glass-light text-text-secondary hover:text-text-primary'
            }`}
          >
            All Platforms
          </button>
          {platforms.map(platform => (
            <button
              key={platform}
              onClick={() => setPlatformFilter(platform)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                platformFilter === platform
                  ? 'bg-primary text-white'
                  : 'bg-glass-light text-text-secondary hover:text-text-primary'
              }`}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map(account => (
            <div key={account.id} className="bg-glass border border-border-color rounded-xl p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img src={account.avatarUrl} alt={account.displayName} className="w-12 h-12 rounded-full" />
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{account.displayName}</h3>
                    <p className="text-xs text-text-secondary">@{account.handle}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getPlatformColor(account.platform)}`}>
                  {account.platform}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-text-primary">{account.followers.toLocaleString()}</p>
                  <p className="text-xs text-text-secondary">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-text-primary">{account.following.toLocaleString()}</p>
                  <p className="text-xs text-text-secondary">Following</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-text-primary">{account.posts}</p>
                  <p className="text-xs text-text-secondary">Posts</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border-color">
                <span className={`text-xs ${account.isConnected ? 'text-green-500' : 'text-red-500'}`}>
                  {account.isConnected ? '● Connected' : '● Disconnected'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditAccount(account)}
                    className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(account)}
                    className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <DeleteIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredAccounts.length === 0 && (
            <div className="col-span-full p-8 text-center text-text-secondary text-sm">
              No social accounts found.
            </div>
          )}
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="bg-glass border border-border-color rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-glass-light border-b border-border-color">
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Content</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Platform</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Published</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Engagement</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {filteredPosts.map(post => (
                  <tr key={post.id} className="hover:bg-glass-light/50 transition-colors">
                    <td className="p-4">
                      <p className="text-sm text-text-primary line-clamp-2">{post.content}</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getPlatformColor(post.platform)}`}>
                        {post.platform}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">
                      {format(new Date(post.publishedAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3 text-xs text-text-secondary">
                        <span>❤️ {post.metrics.likes}</span>
                        <span>💬 {post.metrics.comments}</span>
                        <span>🔁 {post.metrics.shares}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteItem(post)}
                        className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <DeleteIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPosts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-secondary text-sm">
                      No posts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'scheduled' && (
        <div className="bg-glass border border-border-color rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-glass-light border-b border-border-color">
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Content</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Platform</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Scheduled For</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {filteredScheduled.map(post => (
                  <tr key={post.id} className="hover:bg-glass-light/50 transition-colors">
                    <td className="p-4">
                      <p className="text-sm text-text-primary line-clamp-2">{post.content}</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getPlatformColor(post.platform)}`}>
                        {post.platform}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">
                      {format(new Date(post.scheduledFor), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                        post.status === 'scheduled' ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' :
                        post.status === 'published' ? 'text-green-500 bg-green-500/10 border-green-500/20' :
                        post.status === 'failed' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                        'text-text-secondary bg-glass border-border-color'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteItem(post)}
                        className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <DeleteIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredScheduled.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-secondary text-sm">
                      No scheduled posts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'anomalies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnomalies.map(anomaly => (
            <div key={anomaly.id} className="bg-glass border border-border-color rounded-xl p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getSeverityColor(anomaly.severity)}`}>
                  {anomaly.severity}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getPlatformColor(anomaly.platform)}`}>
                  {anomaly.platform}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">{anomaly.type.replace('_', ' ')}</h3>
              <p className="text-sm text-text-secondary mb-3">{anomaly.message}</p>
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>{format(new Date(anomaly.detectedAt), 'MMM dd, yyyy HH:mm')}</span>
                <button
                  onClick={() => handleDeleteItem(anomaly)}
                  className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                >
                  <DeleteIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filteredAnomalies.length === 0 && (
            <div className="col-span-full p-8 text-center text-text-secondary text-sm">
              No anomalies detected.
            </div>
          )}
        </div>
      )}

      {/* Modals - TODO: Create these components */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={(itemToDelete?.handle || itemToDelete?.content || itemToDelete?.message || '').substring(0, 50)}
      />
    </div>
  );
};

export default AdminSocialMediaPage;
