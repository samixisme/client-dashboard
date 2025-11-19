import React, { useEffect, useRef } from 'react';
import { Stage } from '../../types';

interface ChangeBackgroundPopoverProps {
    anchorEl: HTMLElement;
    stage: Stage;
    onClose: () => void;
    onChangeBackground: (stageId: string, color: string) => void;
}

const colors = [
    '#71717a', // zinc-500
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#84cc16', // lime-500
    '#22c55e', // green-500
    '#14b8a6', // teal-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#d946ef', // fuchsia-500
    '#ec4899', // pink-500
];

const ChangeBackgroundPopover: React.FC<ChangeBackgroundPopoverProps> = ({ anchorEl, stage, onClose, onChangeBackground }) => {
    const popoverRef = useRef<HTMLDivElement>(null);

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

    const handleColorSelect = (color: string) => {
        onChangeBackground(stage.id, color);
        onClose();
    };
    
    const rect = anchorEl.getBoundingClientRect();
    const popoverStyle: React.CSSProperties = {
        top: rect.top,
        left: rect.left - (popoverRef.current?.offsetWidth || 300) - 16,
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
                <h3 className="font-semibold text-text-primary">Stage Background</h3>
                <button onClick={onClose} className="text-xl text-text-secondary hover:text-text-primary">&times;</button>
            </div>
            <div className="grid grid-cols-5 gap-3">
                {colors.map(color => (
                    <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        // FIX: Property 'backgroundColor' does not exist on type 'Stage'. Use 'backgroundPattern' instead.
                        className={`w-full aspect-square rounded-lg border-2 transition-transform hover:scale-110 ${stage.backgroundPattern === color ? 'border-primary' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Set color to ${color}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default ChangeBackgroundPopover;