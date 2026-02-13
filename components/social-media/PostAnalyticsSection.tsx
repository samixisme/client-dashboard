import React, { useState } from 'react';
import PostCard from './PostCard';
import { SocialPost } from '../../types';
import { LayoutGrid, List, SlidersHorizontal, Search } from 'lucide-react';

interface PostAnalyticsSectionProps {
  posts: SocialPost[];
  loading?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'engagement' | 'likes' | 'comments';

const PostAnalyticsSection: React.FC<PostAnalyticsSectionProps> = ({ posts, loading = false }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort posts
  const filteredPosts = posts
    .filter(post =>
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.accountHandle.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case 'engagement':
          return b.metrics.engagementRate - a.metrics.engagementRate;
        case 'likes':
          return b.metrics.likes - a.metrics.likes;
        case 'comments':
          return b.metrics.comments - a.metrics.comments;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-96 rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls bar */}
      <div className="rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-glass/40 backdrop-blur-sm border border-white/10 text-white placeholder-gray-500 focus:border-lime-500/30 focus:ring-2 focus:ring-lime-500/20 transition-all duration-300 outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Sort selector */}
            <div className="flex items-center gap-2 bg-glass/40 backdrop-blur-sm rounded-lg p-1">
              <SlidersHorizontal className="h-4 w-4 text-gray-400 ml-2" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="bg-transparent text-sm text-white pr-8 pl-2 py-1.5 outline-none cursor-pointer"
              >
                <option value="date" className="bg-gray-900">Latest</option>
                <option value="engagement" className="bg-gray-900">Engagement</option>
                <option value="likes" className="bg-gray-900">Most Liked</option>
                <option value="comments" className="bg-gray-900">Most Commented</option>
              </select>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-glass/40 backdrop-blur-sm rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`
                  p-2 rounded-md transition-all duration-300
                  ${viewMode === 'grid'
                    ? 'bg-lime-500/20 text-lime-400'
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`
                  p-2 rounded-md transition-all duration-300
                  ${viewMode === 'list'
                    ? 'bg-lime-500/20 text-lime-400'
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-sm text-gray-400">
            Showing <span className="font-semibold text-white">{filteredPosts.length}</span> of{' '}
            <span className="font-semibold text-white">{posts.length}</span> posts
          </p>
        </div>
      </div>

      {/* Posts display */}
      {filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl bg-glass/20 backdrop-blur-xl border border-white/10">
          <div className="w-16 h-16 rounded-full bg-glass/40 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No posts found</h3>
          <p className="text-gray-400 max-w-md">
            {searchQuery
              ? `No posts matching "${searchQuery}"`
              : 'No posts available. Connect your accounts to start seeing your content.'}
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredPosts.map((post, idx) => (
            <div
              key={post.id}
              style={{
                animation: `fadeInUp 0.6s ease-out ${idx * 0.05}s both`,
              }}
            >
              <PostCard post={post} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostAnalyticsSection;
