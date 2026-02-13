import React, { useState } from 'react';
import { SocialPlatform, ScheduledPost } from '../../types';
import { Calendar, Clock, Image, Video, Send, X } from 'lucide-react';
import { Instagram, Twitter, Facebook, Linkedin, Music, Youtube } from 'lucide-react';

interface PostSchedulerProps {
  onSchedule: (post: Omit<ScheduledPost, 'id' | 'status' | 'createdAt'>) => void;
  onClose?: () => void;
}

const platformIcons: Record<SocialPlatform, { icon: React.ReactNode; color: string; name: string }> = {
  instagram: { icon: <Instagram className="h-5 w-5" />, color: '#E1306C', name: 'Instagram' },
  twitter: { icon: <Twitter className="h-5 w-5" />, color: '#1DA1F2', name: 'X (Twitter)' },
  facebook: { icon: <Facebook className="h-5 w-5" />, color: '#1877F2', name: 'Facebook' },
  linkedin: { icon: <Linkedin className="h-5 w-5" />, color: '#0A66C2', name: 'LinkedIn' },
  tiktok: { icon: <Music className="h-5 w-5" />, color: '#000000', name: 'TikTok' },
  youtube: { icon: <Youtube className="h-5 w-5" />, color: '#FF0000', name: 'YouTube' },
};

const PostScheduler: React.FC<PostSchedulerProps> = ({ onSchedule, onClose }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const handlePlatformToggle = (platform: SocialPlatform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMediaFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPlatforms.length === 0 || !content || !scheduledDate || !scheduledTime) {
      alert('Please fill in all required fields');
      return;
    }

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

    // In real app, you would upload media files first and get URLs
    const mediaUrls = mediaFiles.map(f => URL.createObjectURL(f));

    selectedPlatforms.forEach(platform => {
      const post: Omit<ScheduledPost, 'id' | 'status' | 'createdAt'> = {
        platform,
        accountHandle: 'your-handle', // Should come from selected account
        content,
        scheduledFor,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      };

      onSchedule(post);
    });

    // Reset form
    setSelectedPlatforms([]);
    setContent('');
    setScheduledDate('');
    setScheduledTime('');
    setMediaFiles([]);
    onClose?.();
  };

  const characterLimit = selectedPlatforms.includes('twitter') ? 280 : 2200;
  const characterCount = content.length;

  return (
    <div className="rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Schedule Post</h2>
          <p className="text-sm text-gray-400">Create and schedule content across platforms</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-glass/40 hover:bg-glass/60 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Platform selection */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">
            Select Platforms <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.keys(platformIcons) as SocialPlatform[]).map(platform => {
              const { icon, color, name } = platformIcons[platform];
              const isSelected = selectedPlatforms.includes(platform);

              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => handlePlatformToggle(platform)}
                  className={`
                    relative px-4 py-3 rounded-lg font-medium text-sm transition-all duration-300
                    flex items-center gap-3 group overflow-hidden
                    ${isSelected
                      ? 'bg-glass/60 text-white border shadow-lg backdrop-blur-xl'
                      : 'bg-glass/20 text-gray-400 border border-white/10 hover:bg-glass/40'
                    }
                  `}
                  style={{
                    borderColor: isSelected ? `${color}40` : undefined,
                  }}
                >
                  {isSelected && (
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  <div className="relative z-10" style={{ color: isSelected ? color : undefined }}>
                    {icon}
                  </div>
                  <span className="relative z-10">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-white">
              Post Content <span className="text-red-400">*</span>
            </label>
            <span
              className={`text-xs font-medium ${
                characterCount > characterLimit ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              {characterCount} / {characterLimit}
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={6}
            maxLength={characterLimit}
            className="w-full px-4 py-3 rounded-lg bg-glass/40 backdrop-blur-sm border border-white/10 text-white placeholder-gray-500 focus:border-lime-500/30 focus:ring-2 focus:ring-lime-500/20 transition-all duration-300 outline-none resize-none"
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              <Calendar className="inline h-4 w-4 mr-2" />
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-lg bg-glass/40 backdrop-blur-sm border border-white/10 text-white focus:border-lime-500/30 focus:ring-2 focus:ring-lime-500/20 transition-all duration-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              <Clock className="inline h-4 w-4 mr-2" />
              Time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-glass/40 backdrop-blur-sm border border-white/10 text-white focus:border-lime-500/30 focus:ring-2 focus:ring-lime-500/20 transition-all duration-300 outline-none"
            />
          </div>
        </div>

        {/* Media upload */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">
            Media (Optional)
          </label>
          <div className="relative">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
              id="media-upload"
            />
            <label
              htmlFor="media-upload"
              className="flex items-center justify-center gap-3 px-4 py-6 rounded-lg bg-glass/20 border-2 border-dashed border-white/20 hover:border-lime-500/30 hover:bg-glass/30 transition-all duration-300 cursor-pointer group"
            >
              <div className="p-3 rounded-lg bg-glass/40 group-hover:bg-lime-500/20 transition-colors">
                <Image className="h-6 w-6 text-gray-400 group-hover:text-lime-400 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Click to upload media</p>
                <p className="text-xs text-gray-400 mt-1">Images or videos</p>
              </div>
            </label>
          </div>

          {/* Media preview */}
          {mediaFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {mediaFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="relative group px-3 py-2 rounded-lg bg-glass/40 border border-white/10 flex items-center gap-2"
                >
                  {file.type.startsWith('video') ? (
                    <Video className="h-4 w-4 text-purple-400" />
                  ) : (
                    <Image className="h-4 w-4 text-blue-400" />
                  )}
                  <span className="text-xs text-white truncate max-w-[150px]">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMediaFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg bg-glass/40 text-white border border-white/10 hover:bg-glass/60 transition-all duration-300 font-semibold"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={selectedPlatforms.length === 0 || !content || !scheduledDate || !scheduledTime}
            className="flex-1 px-6 py-3 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 hover:bg-lime-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold flex items-center justify-center gap-2"
          >
            <Send className="h-5 w-5" />
            Schedule Post
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostScheduler;
