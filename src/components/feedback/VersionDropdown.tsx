import React, { useState, useRef, useEffect } from 'react';
import { FeedbackItemVersion } from '../../../types';
import { ChevronDown, Plus } from 'lucide-react';

interface VersionDropdownProps {
    projectId: string;
    feedbackItemId: string;
    currentVersion: number;
    versions: FeedbackItemVersion[];
    onVersionChange: (versionNumber: number) => void;
    onCreateVersion: () => void;
    type: 'video' | 'mockup';
}

const VersionDropdown: React.FC<VersionDropdownProps> = ({
    currentVersion,
    versions,
    onVersionChange,
    onCreateVersion
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
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

    const handleVersionSelect = (versionNumber: number) => {
        onVersionChange(versionNumber);
        setIsOpen(false);
    };

    const handleCreateVersion = () => {
        onCreateVersion();
        setIsOpen(false);
    };

    const formatDate = (timestamp: any): string => {
        if (!timestamp) return 'Unknown date';

        let date: Date;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            // Firestore Timestamp
            date = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
            date = new Date(timestamp);
        } else {
            return 'Invalid date';
        }

        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    };

    // Sort versions by version number descending (newest first)
    const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-glass/60 backdrop-blur-xl border border-border-color rounded-lg px-3 py-1.5 flex items-center gap-2 hover:bg-glass/80 transition-all duration-200 text-sm font-medium"
            >
                <span>v{currentVersion}</span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full mt-2 right-0 z-50 min-w-[240px] bg-glass/80 backdrop-blur-xl border border-border-color rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Version List */}
                    <div className="max-h-[300px] overflow-y-auto">
                        {sortedVersions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                No versions available
                            </div>
                        ) : (
                            sortedVersions.map((version) => (
                                <button
                                    key={version.versionNumber}
                                    onClick={() => handleVersionSelect(version.versionNumber)}
                                    className={`w-full px-4 py-3 text-left hover:bg-glass-light/60 transition-all duration-200 border-b border-border-color/50 last:border-b-0 ${
                                        version.versionNumber === currentVersion
                                            ? 'bg-primary/20 text-primary'
                                            : 'text-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">v{version.versionNumber}</span>
                                        <span className="text-xs text-gray-400">
                                            {formatDate(version.createdAt)}
                                        </span>
                                    </div>
                                    {version.createdBy && (
                                        <div className="text-xs text-gray-400 mt-1">
                                            by {version.createdBy}
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Create New Version Button */}
                    <div className="border-t border-border-color/50">
                        <button
                            onClick={handleCreateVersion}
                            className="w-full px-4 py-3 bg-primary text-black hover:bg-primary-hover transition-all duration-200 font-medium flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create New Version</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VersionDropdown;
