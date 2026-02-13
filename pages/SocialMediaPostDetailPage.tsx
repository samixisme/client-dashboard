import React from 'react';
import { useParams, Link } from 'react-router-dom';

const SocialMediaPostDetailPage: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();

    return (
        <div>
            <Link to="/social-media" className="text-primary hover:underline mb-4 inline-block">← Back to Social Media</Link>
            <h1 className="text-4xl font-bold text-text-primary mb-4">Post Details</h1>
            <div className="bg-glass/40 backdrop-blur-xl p-8 rounded-2xl border border-border-color text-text-primary">
                <p>Post ID: {postId}</p>
                <p className="mt-4 text-text-secondary">Full post metrics and engagement breakdown coming soon</p>
            </div>
        </div>
    );
};

export default SocialMediaPostDetailPage;
