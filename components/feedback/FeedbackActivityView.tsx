import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { User, FeedbackComment, Activity } from '../../types';
import { Link } from 'react-router-dom';

const FeedbackActivityView = ({ projectId }: { projectId: string }) => {
    const { data } = useData();
    const { feedbackComments, users, feedbackVideos } = data;

    const projectActivities = useMemo(() => 
        data.activities
            .filter(a => {
                const comment = feedbackComments.find(c => c.id === a.objectId);
                if (comment) return comment.projectId === projectId;
                // Add logic for other activity types if needed
                return false;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [data.activities, feedbackComments, projectId]);

    const getMember = (id: string | undefined): User | undefined => id ? users.find(m => m.id === id) : undefined;

    const formatTimestamp = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-glass p-6 rounded-lg border border-border-color">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
            <div className="space-y-6">
                {projectActivities.map(activity => {
                    const comment = feedbackComments.find(c => c.id === activity.objectId);
                    if (!comment) return null;

                    const reporter = getMember(comment.reporterId);
                    const targetItem = data.feedbackMockups.find(m => m.id === comment.targetId) 
                                   || data.feedbackWebsites.find(w => w.id === comment.targetId) 
                                   || data.feedbackVideos.find(v => v.id === comment.targetId);

                    const isVideoCommentActivity = comment.targetType === 'video' && activity.video_screenshot_url;

                    if (isVideoCommentActivity) {
                        const video = feedbackVideos.find(v => v.id === comment.targetId);
                        const linkTo = `/feedback/${comment.projectId}/video/${video?.id}?t=${activity.comment_timestamp_seconds}`;
                        return (
                            <div key={activity.id} className="flex items-start gap-4">
                                <img className="h-10 w-10 rounded-full object-cover" src={reporter?.avatarUrl} alt={reporter?.name} />
                                <div className="flex-1">
                                    <p className="text-sm text-text-secondary">
                                        <span className="font-semibold text-text-primary">{reporter?.name}</span> commented on <span className="font-semibold text-text-primary">{targetItem?.name}</span>
                                    </p>
                                    <p className="text-xs text-text-secondary mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                                    <Link to={linkTo} className="mt-2 flex items-start gap-3 bg-surface-light p-2 rounded-md hover:ring-2 hover:ring-primary">
                                        <img src={activity.video_screenshot_url} alt="video frame" className="w-24 h-14 object-cover rounded" />
                                        <div>
                                            <p className="text-sm font-semibold text-text-primary">"{comment.comment}"</p>
                                            <p className="text-xs text-text-secondary">at {formatTimestamp(activity.comment_timestamp_seconds || 0)}</p>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={activity.id} className="flex items-start">
                            <img className="h-10 w-10 rounded-full object-cover mr-4" src={reporter?.avatarUrl} alt={reporter?.name} />
                            <div>
                                <p className="text-sm text-text-secondary">
                                    <span className="font-semibold text-text-primary">{reporter?.name}</span> commented on <span className="font-semibold text-text-primary">{targetItem?.name}</span>:
                                </p>
                                <p className="text-sm text-text-primary bg-glass-light p-3 rounded-md mt-1">"{comment.comment}"</p>
                                <p className="text-xs text-text-secondary mt-1.5">{new Date(comment.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    );
                })}
                 {projectActivities.length === 0 && (
                     <p className="text-center text-text-secondary py-8">No activity yet for this project.</p>
                 )}
            </div>
        </div>
    );
};

export default FeedbackActivityView;