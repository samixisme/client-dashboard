import React from 'react';
import { SocialPost, SocialPlatform } from '../../types';
import { Heart, MessageCircle, Share2, Eye, TrendingUp, ExternalLink, Play } from 'lucide-react';
import { Instagram, Twitter, Facebook, Linkedin, Music, Youtube } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: SocialPost;
  onClick?: () => void;
}

const platformIcons: Record<SocialPlatform, { icon: React.ReactNode; color: string }> = {
  instagram: { icon: <Instagram className="h-4 w-4" />, color: '#E1306C' },
  twitter: { icon: <Twitter className="h-4 w-4" />, color: '#1DA1F2' },
  facebook: { icon: <Facebook className="h-4 w-4" />, color: '#1877F2' },
  linkedin: { icon: <Linkedin className="h-4 w-4" />, color: '#0A66C2' },
  tiktok: { icon: <Music className="h-4 w-4" />, color: '#000000' },
  youtube: { icon: <Youtube className="h-4 w-4" />, color: '#FF0000' },
};

const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const navigate = useNavigate();
  const { icon, color } = platformIcons[post.platform];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/social-media/post/${post.id}`);
    }
  };

  const getTypeLabel = () => {
    switch (post.type) {
      case 'image': return 'Photo';
      case 'video': return 'Video';
      case 'carousel': return 'Carousel';
      case 'story': return 'Story';
      case 'reel': return 'Reel';
      default: return 'Post';
    }
  };

  return (
    <div
      onClick={handleClick}
      className="relative overflow-hidden rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 hover:bg-glass/60 transition-all duration-300 group cursor-pointer hover:border-lime-500/30 hover:shadow-lg hover:shadow-lime-500/10"
    >
      {/* Media preview */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="relative h-48 bg-black/40">
          <img
            src={post.mediaUrls[0]}
            alt={post.content.substring(0, 50)}
            className="w-full h-full object-cover"
          />

          {/* Media overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Type badge */}
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md"
            style={{
              backgroundColor: `${color}80`,
              color: 'white',
            }}
          >
            {post.type === 'video' && <Play className="h-3 w-3" />}
            {getTypeLabel()}
          </div>

          {/* Platform badge */}
          <div className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 backdrop-blur-md" style={{ color }}>
            {icon}
          </div>

          {/* Carousel indicator */}
          {post.type === 'carousel' && post.mediaUrls.length > 1 && (
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-xs text-white">
              1/{post.mediaUrls.length}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Post text */}
        <p className="text-sm text-gray-300 line-clamp-3 mb-3 leading-relaxed">
          {post.content}
        </p>

        {/* Post date */}
        <p className="text-xs text-gray-500 mb-3">
          {new Date(post.publishedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-400" />
            <span className="text-sm font-medium text-white">{formatNumber(post.metrics.likes)}</span>
            <span className="text-xs text-gray-500">Likes</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">{formatNumber(post.metrics.comments)}</span>
            <span className="text-xs text-gray-500">Comments</span>
          </div>
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-white">{formatNumber(post.metrics.shares)}</span>
            <span className="text-xs text-gray-500">Shares</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-white">{formatNumber(post.metrics.impressions)}</span>
            <span className="text-xs text-gray-500">Views</span>
          </div>
        </div>

        {/* Engagement rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-lime-400" />
            <span className="text-sm font-semibold text-lime-400">
              {post.metrics.engagementRate.toFixed(2)}%
            </span>
            <span className="text-xs text-gray-500">Engagement</span>
          </div>

          {post.postUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(post.postUrl, '_blank');
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-gray-400 hover:text-lime-400 transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

export default PostCard;
