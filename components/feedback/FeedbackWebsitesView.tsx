import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { FeedbackWebsite } from '../../types';
import { AddIcon } from '../icons/AddIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

const FeedbackWebsitesView = ({ projectId }: { projectId: string }) => {
    const { data, forceUpdate } = useData();
    const websites = data.feedbackWebsites.filter(m => m.projectId === projectId);
    
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim() && newUrl.trim()) {
            const newWebsite: FeedbackWebsite = {
                id: `web-${Date.now()}`,
                projectId,
                name: newName,
                url: newUrl,
                isApproved: false,
                pages: [],
                approvedPageIds: []
            };
            data.feedbackWebsites.push(newWebsite);
            forceUpdate();
            setIsAdding(false);
            setNewName('');
            setNewUrl('');
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover flex items-center gap-2">
                    <AddIcon className="h-4 w-4"/> Add Website
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-glass p-4 rounded-lg border border-border-color mb-6 space-y-4">
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Website Name" className="w-full bg-glass-light border border-border-color rounded-lg px-3 py-2 text-sm" required />
                    <input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://example.com" className="w-full bg-glass-light border border-border-color rounded-lg px-3 py-2 text-sm" required />
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1 bg-glass-light text-text-primary text-xs rounded-lg">Cancel</button>
                        <button type="submit" className="px-3 py-1 bg-primary text-background text-xs font-bold rounded-lg">Save</button>
                    </div>
                </form>
            )}

            <div className="bg-glass rounded-lg border border-border-color overflow-hidden">
                <ul className="divide-y divide-border-color">
                    {websites.map(website => {
                        const total = website.pages?.length || 0;
                        const approved = website.approvedPageIds?.length || 0;
                        const percent = total > 0 ? Math.round((approved / total) * 100) : 0;
                        return (
                             <li key={website.id} className="p-4 flex items-center justify-between hover:bg-glass-light">
                                <div>
                                    <p className="font-semibold text-text-primary">{website.name}</p>
                                    <p className="text-sm text-text-secondary">{total} page(s)</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-4 text-center">
                                        <div><p className="font-bold text-green-400">{approved}</p><p className="text-xs text-text-secondary">Approved</p></div>
                                        <div><p className="font-bold">{total}</p><p className="text-xs text-text-secondary">Total</p></div>
                                        <div><p className="font-bold text-primary">{percent}%</p><p className="text-xs text-text-secondary">Complete</p></div>
                                    </div>
                                    <Link to={`/feedback/${projectId}/websites/${website.id}`} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">
                                        View
                                    </Link>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    );
};

export default FeedbackWebsitesView;