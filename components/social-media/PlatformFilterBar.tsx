import React from 'react';
import { SocialPlatform } from '../../types';
import { Instagram, Twitter, Facebook, Linkedin, Music, Youtube } from 'lucide-react';

interface PlatformFilterBarProps {
  selectedPlatforms: SocialPlatform[];
  onTogglePlatform: (platform: SocialPlatform) => void;
  showAll?: boolean;
}

const platformIcons: Record<SocialPlatform, { icon: React.ReactNode; color: string; name: string }> = {
  instagram: { icon: <Instagram className="h-5 w-5" />, color: '#E1306C', name: 'Instagram' },
  twitter: { icon: <Twitter className="h-5 w-5" />, color: '#1DA1F2', name: 'X (Twitter)' },
  facebook: { icon: <Facebook className="h-5 w-5" />, color: '#1877F2', name: 'Facebook' },
  linkedin: { icon: <Linkedin className="h-5 w-5" />, color: '#0A66C2', name: 'LinkedIn' },
  tiktok: { icon: <Music className="h-5 w-5" />, color: '#000000', name: 'TikTok' },
  youtube: { icon: <Youtube className="h-5 w-5" />, color: '#FF0000', name: 'YouTube' },
};

const PlatformFilterBar: React.FC<PlatformFilterBarProps> = ({
  selectedPlatforms,
  onTogglePlatform,
  showAll = true,
}) => {
  const platforms = Object.keys(platformIcons) as SocialPlatform[];
  const allSelected = selectedPlatforms.length === platforms.length;

  const handleToggleAll = () => {
    if (allSelected) {
      onTogglePlatform(platforms[0]); // Select at least one
    } else {
      platforms.forEach(p => {
        if (!selectedPlatforms.includes(p)) {
          onTogglePlatform(p);
        }
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {showAll && (
        <button
          onClick={handleToggleAll}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300
            ${allSelected
              ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30 shadow-lg shadow-lime-500/10'
              : 'bg-glass/40 text-gray-400 border border-white/10 hover:bg-glass/60 hover:border-white/20'
            }
          `}
        >
          All Platforms
        </button>
      )}

      {platforms.map((platform) => {
        const { icon, color, name } = platformIcons[platform];
        const isSelected = selectedPlatforms.includes(platform);

        return (
          <button
            key={platform}
            onClick={() => onTogglePlatform(platform)}
            className={`
              relative px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300
              flex items-center gap-2 group overflow-hidden
              ${isSelected
                ? 'bg-glass/60 text-white border shadow-lg backdrop-blur-xl'
                : 'bg-glass/20 text-gray-400 border border-white/10 hover:bg-glass/40 hover:border-white/20'
              }
            `}
            style={{
              borderColor: isSelected ? `${color}40` : undefined,
              boxShadow: isSelected ? `0 4px 12px ${color}20` : undefined,
            }}
          >
            {/* Platform color accent */}
            {isSelected && (
              <div
                className="absolute inset-0 opacity-10 transition-opacity duration-300"
                style={{ backgroundColor: color }}
              />
            )}

            {/* Icon with platform color */}
            <div
              className={`relative z-10 transition-all duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}
              style={{ color: isSelected ? color : undefined }}
            >
              {icon}
            </div>

            {/* Platform name */}
            <span className="relative z-10">{name}</span>

            {/* Hover glow */}
            {!isSelected && (
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                style={{ backgroundColor: color }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PlatformFilterBar;
