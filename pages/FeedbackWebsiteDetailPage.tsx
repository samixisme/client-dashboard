import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFeedbackItem } from '../utils/feedbackUtils';
import { FeedbackItem } from '../types';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';

const FeedbackWebsiteDetailPage = () => {
  const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !feedbackItemId) {
      setError("Project or Feedback ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchItem = async () => {
      try {
        const item = await getFeedbackItem(projectId, feedbackItemId);
        if (item && item.assetUrl) {
          const url = `/api/proxy?url=${encodeURIComponent(item.assetUrl)}&projectId=${projectId}&feedbackId=${feedbackItemId}`;
          setProxyUrl(url);
        } else {
          setError("Feedback item not found or it has no associated URL.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch feedback item.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [projectId, feedbackItemId]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-gray-100 p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Loading Feedback Session...</h1>
          <p className="text-gray-600">Please wait while we prepare your live feedback environment.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-gray-100 p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2 text-red-600">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white relative">
      {/* Back button overlay */}
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center justify-center p-2 bg-white/90 backdrop-blur-sm shadow-md rounded-full hover:bg-gray-100 transition-colors border border-gray-200"
          title="Back to Project"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {proxyUrl && (
        <iframe 
          src={proxyUrl} 
          className="w-full h-full border-0"
          title="Feedback Website Proxy"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />
      )}
    </div>
  );
};

export default FeedbackWebsiteDetailPage;
