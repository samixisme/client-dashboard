
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
    id: string;
    type?: string;
    description: string;
    userId?: string;
    projectId: string;
    objectId?: string;
    objectType?: string;
    timestamp?: any;
    createdAt?: any;
}

const FeedbackActivityView = ({ projectId }: { projectId: string }) => {
    const { data } = useData();
    const { users } = data;

    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    // Subscribe to activities from the activities collection
    useEffect(() => {
        const activitiesQuery = query(
            collection(db, "activities"),
            where("projectId", "==", projectId),
            orderBy("timestamp", "desc"),
            limit(20)
        );

        const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
            const fetchedActivities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Activity));
            setActivities(fetchedActivities);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching activities:", error);
            // If index not ready or query fails, show empty state
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    const getUser = (userId?: string) => {
        if (!userId) return { name: 'User', avatarUrl: undefined };
        const user = users.find(u => u.id === userId);
        return user || { name: 'User', avatarUrl: undefined };
    };

    const getActivityTime = (activity: Activity): Date => {
        if (activity.timestamp?.seconds) {
            return new Date(activity.timestamp.seconds * 1000);
        }
        if (activity.createdAt?.seconds) {
            return new Date(activity.createdAt.seconds * 1000);
        }
        return new Date();
    };

    const getActivityLink = (activity: Activity): string => {
        if (activity.objectId && activity.objectType === 'feedback_item') {
            return `/feedback/${projectId}/mockup/${activity.objectId}`;
        }
        return `/feedback/${projectId}`;
    };

    return (
        <div className="bg-glass p-6 rounded-lg border border-border-color">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
             <div className="space-y-6">
                 {loading ? (
                     <p className="text-center text-text-secondary py-4">Loading activity...</p>
                 ) : activities.length === 0 ? (
                     <div className="text-center text-text-secondary py-8">
                        <p className="text-2xl mb-2">📝</p>
                        <p>No recent activity yet.</p>
                        <p className="text-xs mt-1">Activity will appear when feedback items are created, updated, or commented on.</p>
                     </div>
                 ) : (
                     activities.map((activity) => {
                        const user = getUser(activity.userId);
                        const timestamp = getActivityTime(activity);
                        
                        return (
                            <div key={activity.id} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        user.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-primary">
                                        <span className="font-semibold">{user.name}</span>{' '}
                                        {activity.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-text-secondary">
                                            {formatDistanceToNow(timestamp)} ago
                                        </span>
                                        {activity.objectId && (
                                            <Link to={getActivityLink(activity)} className="text-xs text-primary hover:underline">
                                                View
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                     })
                 )}
            </div>
        </div>
    );
};

export default FeedbackActivityView;
