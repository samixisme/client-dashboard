
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Link } from 'react-router-dom';
import { getFeedbackItems, subscribeToComments } from '../../utils/feedbackUtils';
import { formatDistanceToNow } from 'date-fns';

const FeedbackActivityView = ({ projectId }: { projectId: string }) => {
    // In a real app, we would query an 'activity' collection.
    // Here, we'll try to aggregate recent comments from the items we know about.
    // This is "best effort" for the additive requirement without a backend trigger.

    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        
        const fetchRecentActivity = async () => {
             try {
                const items = await getFeedbackItems(projectId);
                
                // We will just fetch the latest comment for each item to show *some* activity
                // without hammering the DB with N listeners just for a sidebar.
                // A better approach is to have a top-level 'recentComments' collection, 
                // but we can't change schema/backend triggers here.
                
                // For now, let's just list the most recently created *Items* as activity.
                // Listing comments inside them requires iterating subcollections which is slow/expensive here.
                
                const itemActivities = items.map(item => ({
                    id: item.id,
                    type: 'item_created',
                    text: `Created new ${item.type} request: ${item.name}`,
                    timestamp: item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000) : new Date(),
                    link: `/feedback/${projectId}/${item.type === 'mockup' ? 'mockup' : item.type === 'video' ? 'video' : 'website'}/${item.id}`,
                    user: 'User' // We don't have user name resolved in item yet
                }));

                if (mounted) {
                    setActivities(itemActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10));
                    setLoading(false);
                }
             } catch (e) {
                 console.error(e);
             }
        };

        fetchRecentActivity();

        return () => { mounted = false; };
    }, [projectId]);

    return (
        <div className="bg-glass p-6 rounded-lg border border-border-color">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
             <div className="space-y-6">
                 {loading ? (
                     <p className="text-center text-text-secondary py-4">Loading activity...</p>
                 ) : activities.length === 0 ? (
                     <p className="text-center text-text-secondary py-8">No recent activity found.</p>
                 ) : (
                     activities.map((activity, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                {activity.user.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm text-text-primary">
                                    <span className="font-semibold">{activity.user}</span> {activity.text.replace(`${activity.user} `, '')}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-text-secondary">{formatDistanceToNow(activity.timestamp)} ago</span>
                                    <Link to={activity.link} className="text-xs text-primary hover:underline">View</Link>
                                </div>
                            </div>
                        </div>
                     ))
                 )}
            </div>
        </div>
    );
};

export default FeedbackActivityView;
