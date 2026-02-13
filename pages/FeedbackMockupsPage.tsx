
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { getFeedbackItems, updateFeedbackItemStatus, updateFeedbackItem } from '../utils/feedbackUtils';
import { FeedbackItem } from '../types';
import { MockupIcon } from '../components/icons/MockupIcon';
import FeedbackItemCard from '../components/feedback/FeedbackItemCard';

const FeedbackMockupsPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { data } = useData();
    const project = data.projects.find(p => p.id === projectId);

    const [mockups, setMockups] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'unapproved'>('all');

    useEffect(() => {
        if (projectId) {
            getFeedbackItems(projectId).then(items => {
                const mockupItems = items.filter(item => item.type === 'mockup');
                setMockups(mockupItems);
                setLoading(false);
            });
        }
    }, [projectId]);

    // Helper function to check if all images in a mockup are approved
    const isFullyApproved = (m: FeedbackItem) =>
        m.images && m.images.length > 0 && m.images.every(img => img.approved);

    const filteredMockups = statusFilter === 'all'
        ? mockups
        : statusFilter === 'approved'
        ? mockups.filter(isFullyApproved)
        : mockups.filter(m => !isFullyApproved(m));

    const handleEdit = async (mockupId: string, newName: string, newDescription?: string) => {
        if (!projectId) return;
        await updateFeedbackItem(projectId, mockupId, {
            name: newName,
            description: newDescription
        });
        // Refresh data
        const items = await getFeedbackItems(projectId);
        const mockupItems = items.filter(item => item.type === 'mockup');
        setMockups(mockupItems);
    };

    const handleStatusToggle = async (mockupId: string, currentApprovedStatus: boolean) => {
        if (!projectId) return;

        // Find the mockup
        const mockup = mockups.find(m => m.id === mockupId);
        if (!mockup) return;

        // Toggle all images to the opposite of current status
        const newApprovedStatus = !currentApprovedStatus;
        const updatedImages = (mockup.images || []).map(img => ({
            ...img,
            approved: newApprovedStatus
        }));

        // Update the images in Firestore
        // Note: updateFeedbackItem only accepts name/description, so we need to use a different method
        // For now, we'll skip updating images through this method
        // await updateFeedbackItem(projectId, mockupId, {
        //     images: updatedImages
        // });

        // Refresh data
        const items = await getFeedbackItems(projectId);
        const mockupItems = items.filter(item => item.type === 'mockup');
        setMockups(mockupItems);
    };

    return (
        <div>
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(200%);
                    }
                }

                .animate-fade-in-up {
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }

                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }

                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>

            {/* Status Filter */}
            <div className="mt-6 flex gap-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        statusFilter === 'all'
                            ? 'bg-primary text-black shadow-lg'
                            : 'bg-glass/40 backdrop-blur-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass/60'
                    }`}
                >
                    All ({mockups.length})
                </button>
                <button
                    onClick={() => setStatusFilter('approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        statusFilter === 'approved'
                            ? 'bg-green-500 text-white shadow-lg'
                            : 'bg-glass/40 backdrop-blur-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass/60'
                    }`}
                >
                    Approved ({mockups.filter(m => m.images && m.images.length > 0 && m.images.every(img => img.approved)).length})
                </button>
                <button
                    onClick={() => setStatusFilter('unapproved')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        statusFilter === 'unapproved'
                            ? 'bg-yellow-500 text-black shadow-lg'
                            : 'bg-glass/40 backdrop-blur-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass/60'
                    }`}
                >
                    Unapproved ({mockups.filter(m => !m.images || m.images.length === 0 || !m.images.every(img => img.approved)).length})
                </button>
            </div>

            <div className="mt-8">
                {loading ? (
                    <div className="text-center py-10 text-text-secondary">Loading mockups...</div>
                ) : filteredMockups.length === 0 ? (
                    <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-xl animate-fade-in">
                        <div className="w-20 h-20 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center mb-6 border border-primary/20">
                            <MockupIcon className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">No Mockups Yet</h3>
                        <p className="text-text-secondary/90 max-w-md">
                            Create a new mockup feedback request from the main project feedback page.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMockups.map((mockup, index) => {
                            // Calculate if all images are approved
                            const allImagesApproved = mockup.images && mockup.images.length > 0
                                ? mockup.images.every(img => img.approved)
                                : false;

                            return (
                                <FeedbackItemCard
                                    key={mockup.id}
                                    type="mockup"
                                    id={mockup.id}
                                    name={mockup.name}
                                    assetUrl={mockup.assetUrl}
                                    createdAt={mockup.createdAt}
                                    commentCount={mockup.commentCount || 0}
                                    status={mockup.status}
                                    approved={allImagesApproved}
                                    projectId={projectId || ''}
                                    projectName={project?.name}
                                    feedbackItemId={mockup.id}
                                    versions={mockup.versions || []}
                                    currentVersion={mockup.version || 1}
                                    images={mockup.images || []}
                                    onEdit={handleEdit}
                                    onToggleApproval={(id) => handleStatusToggle(id, allImagesApproved)}
                                    onNavigate={() => navigate(`/feedback/${projectId}/mockup/${mockup.id}`)}
                                    index={index}
                                    showVersionDropdown={false}
                                    showScreensCount={true}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackMockupsPage;
