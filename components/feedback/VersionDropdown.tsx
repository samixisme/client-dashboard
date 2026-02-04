import React, { useState, useEffect, useRef } from 'react';
import { FeedbackItemVersion } from '../../types';
import { useData } from '../../contexts/DataContext';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

interface VersionDropdownProps {
    projectId: string;
    feedbackItemId: string;
    currentVersion: number;
    versions: FeedbackItemVersion[];
    onVersionChange: (versionNumber: number) => void;
    onCreateVersion: () => void;
    type: 'video' | 'mockup';
}

export const VersionDropdown: React.FC<VersionDropdownProps> = ({
    projectId,
    feedbackItemId,
    currentVersion,
    versions,
    onVersionChange,
    onCreateVersion,
    type
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { data } = useData();

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Format date nicely
    const formatDate = (timestamp: any): string => {
        try {
            let date: Date;

            if (!timestamp) {
                return 'Unknown date';
            }

            // Handle Firestore Timestamp
            if (timestamp.seconds) {
                date = new Date(timestamp.seconds * 1000);
            } else if (timestamp instanceof Date) {
                date = timestamp;
            } else if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            } else {
                return 'Unknown date';
            }

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }

            // Format as "Jan 15, 2025"
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Unknown date';
        }
    };

    // Get user name from userId
    const getUserName = (userId: string): string => {
        try {
            if (!userId || !data?.users) {
                return 'Unknown user';
            }

            const user = data.users.find(u => u.id === userId);

            if (!user) {
                return 'Unknown user';
            }

            // Return name with fallback to firstName + lastName, then email
            return user.name ||
                   (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') ||
                   user.email ||
                   'Unknown user';
        } catch (error) {
            console.error('Error getting user name:', error);
            return 'Unknown user';
        }
    };

    // Handle version selection
    const handleVersionSelect = (versionNumber: number) => {
        if (versionNumber !== currentVersion) {
            onVersionChange(versionNumber);
        }
        setIsOpen(false);
    };

    // Toggle dropdown
    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    // Sort versions by version number descending (newest first)
    const sortedVersions = [...(versions || [])].sort((a, b) => b.versionNumber - a.versionNumber);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Main Button */}
            <button
                onClick={toggleDropdown}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-glass-light/60 backdrop-blur-sm border border-border-color/50 rounded-lg hover:bg-glass-light/80 hover:border-primary/50 transition-all duration-300 text-xs font-medium"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <span className="text-text-primary font-semibold">
                    v{currentVersion}
                </span>
                <ChevronDownIcon
                    className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full mt-1 left-0 w-64 bg-glass/90 backdrop-blur-2xl border border-border-color rounded-xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Version List */}
                    <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                        {sortedVersions.length === 0 ? (
                            <div className="px-4 py-8 text-center text-text-secondary text-sm">
                                No versions available
                            </div>
                        ) : (
                            sortedVersions.map((version) => {
                                const isActive = version.versionNumber === currentVersion;

                                return (
                                    <button
                                        key={version.versionNumber}
                                        onClick={() => handleVersionSelect(version.versionNumber)}
                                        className={`w-full px-4 py-2.5 text-left hover:bg-glass-light/60 transition-all duration-200 ${
                                            isActive ? 'bg-primary/20 border-l-2 border-primary' : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold text-sm ${isActive ? 'text-primary' : 'text-text-primary'}`}>
                                                    v{version.versionNumber}
                                                </span>
                                                {isActive && (
                                                    <span className="text-xs px-2 py-0.5 bg-primary/30 text-primary rounded-full font-medium">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-text-secondary whitespace-nowrap">
                                                {formatDate(version.createdAt)}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Create New Version Button */}
                    <div className="border-t border-border-color">
                        <button
                            onClick={() => {
                                onCreateVersion();
                                setIsOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left bg-glass-light/40 hover:bg-glass-light/60 transition-all duration-300 text-primary font-semibold text-sm flex items-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span> Create New Version
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VersionDropdown;
