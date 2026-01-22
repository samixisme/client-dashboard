import React, { useState, useRef, useEffect } from 'react';
import { PlayIcon } from '../icons/PlayIcon';
import { PauseIcon } from '../icons/PauseIcon';

interface VideoPlayerHUDProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    duration: number;
    currentTime: number;
    bufferedEnd: number;
    isPlaying: boolean;
    playbackRate: number;
    volume: number;
    isMuted: boolean;
    zoom: number;
    showPins: boolean;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    onSeek: (time: number) => void;
    onRateChange: (rate: number) => void;
    onVolumeChange: (volume: number) => void;
    onMuteToggle: () => void;
    onZoomChange: (zoom: number) => void;
    onPinsToggle: () => void;
    onAddComment: () => void;
    comments?: { id: string; startTime?: number; endTime?: number; resolved?: boolean; commentText?: string }[];
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2];

const StopIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
);

const VolumeIcon = ({ className, muted }: { className?: string; muted?: boolean }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {muted ? (
            <>
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
            </>
        ) : (
            <>
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </>
        )}
    </svg>
);

const EyeIcon = ({ className, off }: { className?: string; off?: boolean }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {off ? (
            <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
            </>
        ) : (
            <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
            </>
        )}
    </svg>
);

const ZoomIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
);

const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const VideoPlayerHUD: React.FC<VideoPlayerHUDProps> = ({
    videoRef,
    duration,
    currentTime,
    bufferedEnd,
    isPlaying,
    playbackRate,
    volume,
    isMuted,
    zoom,
    showPins,
    onPlay,
    onPause,
    onStop,
    onSeek,
    onRateChange,
    onVolumeChange,
    onMuteToggle,
    onZoomChange,
    onPinsToggle,
    onAddComment,
    comments = []
}) => {
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showZoomMenu, setShowZoomMenu] = useState(false);
    const progressRef = useRef<HTMLDivElement>(null);

    const handleProgressClick = (e: React.MouseEvent) => {
        if (!progressRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        onSeek(Math.max(0, Math.min(duration, pos * duration)));
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const buffered = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

    return (
        <div className="bg-glass/90 backdrop-blur-lg border border-border-color rounded-lg px-4 py-3 flex items-center gap-4 w-full max-w-5xl mx-auto shadow-xl">
            {/* Transport Controls */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={isPlaying ? onPause : onPlay}
                    className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center hover:bg-primary-hover transition-colors"
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
                </button>
                <button 
                    onClick={onStop}
                    className="w-8 h-8 rounded-lg bg-glass-light text-text-primary flex items-center justify-center hover:bg-border-color transition-colors"
                    title="Stop"
                >
                    <StopIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Time Display */}
            <div className="text-xs text-text-primary font-mono w-24 text-center flex-shrink-0">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Progress Bar */}
            <div 
                ref={progressRef}
                className="flex-1 relative h-2 bg-glass-light rounded cursor-pointer group"
                onClick={handleProgressClick}
            >
                {/* Buffered */}
                <div 
                    className="absolute top-0 left-0 h-full bg-white/20 rounded pointer-events-none"
                    style={{ width: `${buffered}%` }}
                />
                {/* Progress */}
                <div 
                    className="absolute top-0 left-0 h-full bg-primary rounded pointer-events-none"
                    style={{ width: `${progress}%` }}
                />
                {/* Playhead */}
                <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ left: `calc(${progress}% - 8px)` }}
                />
                {/* Comment Markers */}
                {comments.filter(c => !c.resolved && c.startTime !== undefined).map(comment => (
                    <div 
                        key={comment.id}
                        className="absolute top-0 w-1.5 h-full bg-primary hover:bg-primary-hover transition-colors z-10"
                        style={{ left: `${((comment.startTime || 0) / duration) * 100}%` }}
                        title={comment.commentText}
                    />
                ))}
            </div>

            {/* Playback Speed */}
            <div className="relative">
                <button 
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-2 py-1 text-xs font-bold text-text-primary bg-glass-light rounded hover:bg-border-color transition-colors"
                >
                    {playbackRate}x
                </button>
                {showSpeedMenu && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface border border-border-color rounded-lg shadow-xl overflow-hidden z-50">
                        {PLAYBACK_RATES.map(rate => (
                            <button
                                key={rate}
                                onClick={() => { onRateChange(rate); setShowSpeedMenu(false); }}
                                className={`block w-full px-4 py-2 text-xs text-left hover:bg-glass-light transition-colors ${playbackRate === rate ? 'text-primary font-bold' : 'text-text-primary'}`}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Volume */}
            <div className="relative"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
            >
                <button 
                    onClick={onMuteToggle}
                    className="w-8 h-8 rounded-lg bg-glass-light text-text-primary flex items-center justify-center hover:bg-border-color transition-colors"
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    <VolumeIcon className="w-4 h-4" muted={isMuted || volume === 0} />
                </button>
                {showVolumeSlider && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface border border-border-color rounded-lg p-3 shadow-xl z-50">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                            className="w-24 h-2 accent-primary cursor-pointer"
                            style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: '80px', width: '8px' }}
                        />
                    </div>
                )}
            </div>

            {/* Zoom */}
            <div className="relative">
                <button 
                    onClick={() => setShowZoomMenu(!showZoomMenu)}
                    className="w-8 h-8 rounded-lg bg-glass-light text-text-primary flex items-center justify-center hover:bg-border-color transition-colors"
                    title="Zoom"
                >
                    <ZoomIcon className="w-4 h-4" />
                </button>
                {showZoomMenu && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface border border-border-color rounded-lg p-3 shadow-xl z-50 w-48">
                        <div className="text-xs text-text-secondary mb-2 text-center">{Math.round(zoom * 100)}%</div>
                        <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={zoom}
                            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                            className="w-full h-2 accent-primary cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-text-secondary mt-1">
                            <span>10%</span>
                            <span>500%</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Pin Visibility Toggle */}
            <button 
                onClick={onPinsToggle}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showPins ? 'bg-primary/20 text-primary' : 'bg-glass-light text-text-secondary'}`}
                title={showPins ? 'Hide Pins' : 'Show Pins'}
            >
                <EyeIcon className="w-4 h-4" off={!showPins} />
            </button>

            {/* Add Comment Button */}
            <button 
                onClick={onAddComment}
                className="px-4 py-2 bg-primary text-black text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors whitespace-nowrap"
            >
                + Comment
            </button>
        </div>
    );
};

export default VideoPlayerHUD;
