
import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { FeedbackComment, User } from '../../types';
import { SearchIcon } from '../icons/SearchIcon';
import { Link } from 'react-router-dom';

const FeedbackTasksView = ({ projectId }: { projectId: string }) => {
    const { data } = useData();
    const { feedbackComments, users, feedbackMockups, feedbackWebsites, feedbackVideos, projects } = data;

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [reporterFilter, setReporterFilter] = useState('All');
    const [assignedFilter, setAssignedFilter] = useState('All');

    const projectComments = useMemo(() => 
        feedbackComments.filter(c => c.projectId === projectId),
    [feedbackComments, projectId]);

    const filteredComments = useMemo(() => {
        return projectComments.filter(c => {
            if (statusFilter !== 'All' && c.status !== statusFilter) return false;
            if (reporterFilter !== 'All' && c.reporterId !== reporterFilter) return false;
            if (assignedFilter !== 'All' && (c.assignedId || 'unassigned') !== assignedFilter) return false;
            if (searchTerm && !c.comment.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });
    }, [projectComments, statusFilter, reporterFilter, assignedFilter, searchTerm]);

    const getMember = (id: string | undefined): User | undefined => id ? users.find(m => m.id === id) : undefined;
    
    const getTargetItem = (comment: FeedbackComment) => {
        switch (comment.targetType) {
            case 'mockup': return feedbackMockups.find(m => m.id === comment.targetId);
            case 'website': return feedbackWebsites.find(w => w.id === comment.targetId);
            case 'video': return feedbackVideos.find(v => v.id === comment.targetId);
            default: return null;
        }
    }
    
    const project = projects.find(p => p.id === projectId);

    return (
        <div>
            <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="relative flex-grow">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon className="h-5 w-5 text-text-secondary"/></span>
                    <input type="search" placeholder="Search tasks by content..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-72 pl-10 pr-4 py-2 rounded-lg bg-glass focus:outline-none text-text-primary border border-border-color" />
                </div>
                {/* Filters */}
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-glass border border-border-color rounded-lg px-3 py-2 text-sm">
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Resolved">Resolved</option>
                </select>
                <select value={reporterFilter} onChange={e => setReporterFilter(e.target.value)} className="bg-glass border border-border-color rounded-lg px-3 py-2 text-sm">
                    <option value="All">All Reporters</option>
                    {users.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)} className="bg-glass border border-border-color rounded-lg px-3 py-2 text-sm">
                    <option value="All">All Assigned</option>
                    <option value="unassigned">Unassigned</option>
                    {users.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div className="bg-glass rounded-lg border border-border-color overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-color">
                        <thead className="bg-glass-light">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Reporter</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Content</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">On Item</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Assigned</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Due Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {filteredComments.map(comment => {
                                const reporter = getMember(comment.reporterId);
                                const assigned = getMember(comment.assignedId);
                                const targetItem = getTargetItem(comment);
                                
                                let link = '';
                                if (comment.targetType === 'mockup') {
                                    link = `/feedback/${projectId}/mockup/${comment.targetId}?imageId=${comment.imageId}&commentId=${comment.id}`;
                                } else if (comment.targetType === 'video') {
                                    link = `/feedback/${projectId}/video/${comment.targetId}?videoAssetId=${comment.videoAssetId}&commentId=${comment.id}`;
                                } else {
                                    link = `/feedback/${projectId}/${comment.targetType}/${comment.targetId}?commentId=${comment.id}`;
                                }


                                return (
                                    <tr key={comment.id} className="hover:bg-glass-light">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <img src={reporter?.avatarUrl} alt={reporter?.name} className="w-8 h-8 rounded-full" />
                                                <span className="font-medium">{reporter?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-sm">
                                            <Link to={link} className="text-sm text-text-primary hover:text-primary truncate block">
                                                <span className="font-bold text-primary mr-2">#{comment.pin_number}</span>{comment.comment}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                            <Link to={link} className="hover:text-primary">{targetItem?.name}</Link>
                                            {comment.pageUrl && <span className="block text-xs font-mono">{comment.pageUrl}</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {assigned ? (
                                                <div className="flex items-center gap-3" title={assigned.name}>
                                                    <img src={assigned.avatarUrl} alt={assigned.name} className="w-8 h-8 rounded-full" />
                                                </div>
                                            ) : <span className="text-xs text-text-secondary">Unassigned</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                            {comment.dueDate ? new Date(comment.dueDate).toLocaleDateString() : '–'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${comment.status === 'Resolved' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{comment.status}</span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FeedbackTasksView;
