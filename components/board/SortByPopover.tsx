
import React, { useState, useEffect, useRef } from 'react';
import { Stage } from '../../types';

interface SortByPopoverProps {
    anchorEl: HTMLElement;
    stage: Stage;
    onClose: () => void;
    onApplySort: (stageId: string, config: Stage['sortConfig']) => void;
}

const sortOptions = [
    { key: 'createdAt', label: 'Date Created' },
    { key: 'priority', label: 'Priority' },
    { key: 'title', label: 'Task Name' },
    { key: 'dueDate', label: 'Due Date' },
] as const;


const SortByPopover: React.FC<SortByPopoverProps> = ({ anchorEl, stage, onClose, onApplySort }) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    // FIX: Add explicit type to useState to prevent type widening issues with the state object.
    const [sortConfig, setSortConfig] = useState<NonNullable<Stage['sortConfig']>>(stage.sortConfig || { key: 'createdAt', direction: 'asc' });
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
                anchorEl && !anchorEl.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, anchorEl]);

    const handleApply = () => {
        onApplySort(stage.id, sortConfig);
        onClose();
    };

    const rect = anchorEl.getBoundingClientRect();
    const popoverStyle: React.CSSProperties = {
        top: rect.top, // Align with the button that opened it
        left: rect.left - (popoverRef.current?.offsetWidth || 300) - 16, // Position to the left
        position: 'fixed',
    };
    
    return (
        <div 
            ref={popoverRef}
            className="z-30 w-72 bg-surface rounded-xl shadow-lg border border-border-color p-4"
            style={popoverStyle}
        >
            <div className="flex justify-between items-center mb-4">
                <button onClick={onClose} className="text-text-secondary hover:text-text-primary">&larr;</button>
                <h3 className="font-semibold text-text-primary">Sort Options</h3>
                <button onClick={onClose} className="text-xl text-text-secondary hover:text-text-primary">&times;</button>
            </div>
            
            <div className="space-y-3 mb-4">
                {sortOptions.map(option => (
                    <label key={option.key} className="flex items-center gap-3 text-sm text-text-primary cursor-pointer">
                        <input
                            type="radio"
                            name="sort-key"
                            checked={sortConfig.key === option.key}
                            onChange={() => setSortConfig(c => ({...c, key: option.key }))}
                            className="h-4 w-4 text-primary bg-glass-light border-border-color focus:ring-primary focus:ring-offset-surface"
                        />
                        {option.label}
                    </label>
                ))}
            </div>
            
            <div className="flex bg-surface-light p-1 rounded-lg border border-border-color mb-4">
                <button 
                    onClick={() => setSortConfig(c => ({...c, direction: 'asc'}))}
                    className={`flex-1 text-center text-sm py-1.5 rounded-md ${sortConfig.direction === 'asc' ? 'bg-primary text-background font-semibold' : 'text-text-secondary'}`}
                >
                    Ascending
                </button>
                <button 
                    onClick={() => setSortConfig(c => ({...c, direction: 'desc'}))}
                    className={`flex-1 text-center text-sm py-1.5 rounded-md ${sortConfig.direction === 'desc' ? 'bg-primary text-background font-semibold' : 'text-text-secondary'}`}
                >
                    Descending
                </button>
            </div>
            
            <button onClick={handleApply} className="w-full px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">
                Apply
            </button>
        </div>
    );
};

export default SortByPopover;
