
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddIcon } from '../../components/icons/AddIcon';
import { getAllFeedbackItems } from '../../utils/feedbackUtils';
import { FeedbackItem, FeedbackStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { MockupIcon } from '../../components/icons/MockupIcon';
import { WebsiteIcon } from '../../components/icons/WebsiteIcon';
import { VideoIcon } from '../../components/icons/VideoIcon';

const AdminFeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useData(); // Assuming this context has all projects for name lookup
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering State
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    getAllFeedbackItems().then((items) => {
      setFeedbackItems(items);
      setLoading(false);
    });
  }, []);

  const getProjectName = (projectId: string) => {
      const project = data.projects.find(p => p.id === projectId);
      return project ? project.name : 'Unknown Project';
  };

  const getStatusColor = (status: FeedbackStatus) => {
      switch (status) {
          case 'pending': return 'bg-yellow-500/20 text-yellow-500';
          case 'in_review': return 'bg-blue-500/20 text-blue-500';
          case 'changes_requested': return 'bg-red-500/20 text-red-500';
          case 'approved': return 'bg-green-500/20 text-green-500';
          default: return 'bg-gray-500/20 text-gray-500';
      }
  };
  
  const filteredItems = useMemo(() => {
      return feedbackItems.filter(item => {
          const statusMatch = statusFilter === 'all' || item.status === statusFilter;
          const typeMatch = typeFilter === 'all' || item.type === typeFilter;
          return statusMatch && typeMatch;
      });
  }, [feedbackItems, statusFilter, typeFilter]);

  const handleRowClick = (item: FeedbackItem) => {
      // Determine the correct route based on item type
      // Using the structure defined in existing pages: /feedback/{projectId}/mockup/{itemId} etc.
      // NOTE: The existing pages might need slight route adjustments to match the new item IDs seamlessly.
      // For now, we assume the detail pages can handle the IDs or we direct to the type-specific detail route.
      let route = '';
      if (item.type === 'mockup') {
          route = `/feedback/${item.projectId}/mockup/${item.id}`;
      } else if (item.type === 'video') {
           route = `/feedback/${item.projectId}/video/${item.id}`;
      } else if (item.type === 'website') {
           route = `/feedback/${item.projectId}/website/${item.id}`;
      }
      
      if (route) {
          navigate(route);
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-text-primary">Manage Feedback</h2>
                <p className="text-text-secondary text-sm mt-1">Review and moderate client feedback across all projects.</p>
            </div>
             <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20">
                <AddIcon className="h-4 w-4" />
                New Request
            </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
            <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-glass border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_review">In Review</option>
                <option value="changes_requested">Changes Requested</option>
                <option value="approved">Approved</option>
            </select>
             <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-glass border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
                <option value="all">All Types</option>
                <option value="mockup">Mockup</option>
                <option value="website">Website</option>
                <option value="video">Video</option>
            </select>
        </div>

        {loading ? (
             <div className="text-center py-10 text-text-secondary">Loading feedback items...</div>
        ) : filteredItems.length === 0 ? (
             <div className="bg-glass border border-border-color rounded-xl p-10 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 rounded-full bg-glass-light flex items-center justify-center mb-4">
                    <span className="text-2xl">📭</span>
                 </div>
                 <h3 className="text-lg font-semibold text-text-primary">No Feedback Items Found</h3>
                 <p className="text-text-secondary max-w-md mt-2">
                     Try adjusting your filters or create a new feedback request.
                 </p>
            </div>
        ) : (
            <div className="bg-glass border border-border-color rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-glass-light border-b border-border-color text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            <th className="px-6 py-4">Item Name</th>
                            <th className="px-6 py-4">Project</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Submitted By</th>
                            <th className="px-6 py-4">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {filteredItems.map((item) => (
                            <tr 
                                key={item.id} 
                                onClick={() => handleRowClick(item)}
                                className="hover:bg-glass-light transition-colors cursor-pointer group"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {item.type === 'mockup' && <MockupIcon className="w-5 h-5 text-purple-400"/>}
                                        {item.type === 'website' && <WebsiteIcon className="w-5 h-5 text-blue-400"/>}
                                        {item.type === 'video' && <VideoIcon className="w-5 h-5 text-red-400"/>}
                                        <div>
                                            <p className="font-medium text-text-primary text-sm group-hover:text-primary transition-colors">{item.name}</p>
                                            <p className="text-xs text-text-secondary truncate max-w-[200px]">{item.description}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-text-secondary">
                                    {getProjectName(item.projectId)}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-medium text-text-secondary capitalize px-2 py-1 bg-secondary/10 rounded-full border border-border-color">
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${getStatusColor(item.status)}`}>
                                        {item.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-text-secondary">
                                    {item.createdBy}
                                </td>
                                <td className="px-6 py-4 text-sm text-text-secondary">
                                    {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
  );
};

export default AdminFeedbackPage;
