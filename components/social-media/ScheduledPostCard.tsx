import React from 'react';
import { ScheduledPost, SocialPlatform } from '../../types';
import { Clock, Edit, Trash2, Send, Calendar, Image, Video } from 'lucide-react';
import { Instagram, Twitter, Facebook, Linkedin, Music, Youtube } from 'lucide-react';

interface ScheduledPostCardProps {
  post: ScheduledPost;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onPublishNow?: (postId: string) => void;
}

const platformIcons: Record<SocialPlatform, { icon: React.ReactNode; color: string; name: string }> = {
  instagram: { icon: <Instagram className="h-4 w-4" />, color: '#E1306C', name: 'Instagram' },
  twitter: { icon: <Twitter className="h-4 w-4" />, color: '#1DA1F2', name: 'X' },
  facebook: { icon: <Facebook className="h-4 w-4" />, color: '#1877F2', name: 'Facebook' },
  linkedin: { icon: <Linkedin className="h-4 w-4" />, color: '#0A66C2', name: 'LinkedIn' },
  tiktok: { icon: <Music className="h-4 w-4" />, color: '#000000', name: 'TikTok' },
  youtube: { icon: <Youtube className="h-4 w-4" />, color: '#FF0000', name: 'YouTube' },
};

const ScheduledPostCard: React.FC<ScheduledPostCardProps> = ({
  post,
  onEdit,
  onDelete,
  onPublishNow,
}) => {
  const { icon, color, name } = platformIcons[post.platform];

  const getStatusBadge = () => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      scheduled: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      pending: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      publishing: { label: 'Publishing...', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      published: { label: 'Published', color: 'bg-lime-500/20 text-lime-400 border-lime-500/30' },
      cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
      failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    };

    const config = statusConfig[post.status] ?? statusConfig['scheduled'];

    return (
      <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${config.color}`}>
        {config.label}
      </div>
    );
  };

  const getTimeUntil = () => {
    const now = new Date();
    const scheduled = new Date(post.scheduledFor);
    const diff = scheduled.getTime() - now.getTime();

    if (diff < 0) return 'Overdue';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `in ${days}d ${hours}h`;
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    return `in ${minutes}m`;
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 p-4 hover:bg-glass/60 transition-all duration-300 group hover:border-lime-500/30 hover:shadow-lg hover:shadow-lime-500/10">
      {/* Platform color accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: color }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-lg backdrop-blur-sm"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-xs text-gray-500">@{post.accountHandle}</p>
          </div>
        </div>

        {getStatusBadge()}
      </div>

      {/* Content preview */}
      <p className="text-sm text-gray-300 line-clamp-3 mb-3 leading-relaxed">
        {post.content}
      </p>

      {/* Media indicator */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {post.mediaUrls[0].includes('video') || post.mediaUrls[0].includes('.mp4') ? (
            <Video className="h-4 w-4 text-purple-400" />
          ) : (
            <Image className="h-4 w-4 text-blue-400" />
          )}
          <span className="text-xs text-gray-400">
            {post.mediaUrls.length} {post.mediaUrls.length === 1 ? 'file' : 'files'} attached
          </span>
        </div>
      )}

      {/* Scheduling info */}
      <div className="flex items-center gap-4 mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-400">
            {new Date(post.scheduledFor).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-lime-400" />
          <span className="text-xs font-medium text-lime-400">
            {getTimeUntil()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {(post.status === 'scheduled' || (post.status as string) === 'pending') && (
          <>
            <button
              onClick={() => onPublishNow?.(post.id)}
              className="flex-1 px-3 py-2 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 hover:bg-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Send className="h-4 w-4" />
              Publish Now
            </button>
            <button
              onClick={() => onEdit?.(post.id)}
              className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all duration-300"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete?.(post.id)}
              className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all duration-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}

        {post.status === 'failed' && post.error && (
          <div className="flex-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
            Error: {post.error}
          </div>
        )}
      </div>

      {/* Hover glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

export default ScheduledPostCard;
