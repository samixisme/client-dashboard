import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Stage } from '../../types';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { CancelIcon } from '../icons/CancelIcon';
import { backgroundPatterns } from '../../data/patterns';

interface StageActionsPopoverProps {
    anchorEl: HTMLElement;
    stage: Stage;
    onClose: () => void;
    onArchiveStage: (stageId: string) => void;
    onArchiveAllTasks: (stageId: string) => void;
    onCopyStage: (stageId: string) => void;
    onSetStatus: (stageId: string, status: 'Open' | 'Closed') => void;
    onMoveAllTasks: () => void;
    onApplySort: (stageId: string, config: Stage['sortConfig']) => void;
    onChangePattern: (stageId: string, patternId?: string) => void;
    onOpenReorder: () => void;
}

const sortOptions = [
    { key: 'createdAt', label: 'Date Created' },
    { key: 'priority', label: 'Priority' },
    { key: 'title', label: 'Task Name' },
    { key: 'dueDate', label: 'Due Date' },
] as const;

const StageActionsPopover: React.FC<StageActionsPopoverProps> = ({ 
    anchorEl, 
    stage, 
    onClose, 
    onArchiveStage, 
    onArchiveAllTasks,
    onCopyStage,
    onSetStatus,
    onMoveAllTasks,
    onApplySort,
    onChangePattern,
    onOpenReorder,
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'main' | 'sort' | 'background'>('main');
    const [style, setStyle] = useState<React.CSSProperties>({});

    const [sortConfig, setSortConfig] = useState<NonNullable<Stage['sortConfig']>>(stage.sortConfig || { key: 'createdAt', direction: 'asc' });
    
    useLayoutEffect(() => {
        if (anchorEl && popoverRef.current) {
            const rect = anchorEl.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect();

            let top = rect.bottom + 8;
            let left = rect.left;

            if (left + popoverRect.width > window.innerWidth - 16) {
                left = window.innerWidth - popoverRect.width - 16;
            }
            if (left < 16) {
                left = 16;
            }
            if (top + popoverRect.height > window.innerHeight - 16) {
                top = rect.top - popoverRect.height - 8;
            }

            setStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
            });
        }
    }, [anchorEl, view]);

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

    useEffect(() => {
        setView('main');
        setSortConfig(stage.sortConfig || { key: 'createdAt', direction: 'asc' });
    }, [stage]);
    
    const newStatus = stage.status === 'Open' ? 'Closed' : 'Open';

    const handleActionClick = (action: () => void) => () => {
        action();
        onClose();
    };

    const handleApplySort = () => {
        onApplySort(stage.id, sortConfig);
        onClose();
    };

    const handlePatternSelect = (patternId?: string) => {
        onChangePattern(stage.id, patternId);
        onClose();
    };

    const MainView = (
        <div className="p-2">
            <button onClick={() => setView('sort')} className="w-full text-left block px-3 py-2 text-sm text-text-secondary rounded-md hover:bg-surface-light hover:text-text-primary">Sort By</button>
            <button onClick={() => setView('background')} className="w-full text-left block px-3 py-2 text-sm text-text-secondary rounded-md hover:bg-surface-light hover:text-text-primary">Change Background</button>
            <button onClick={handleActionClick(onOpenReorder)} className="w-full text-left block px-3 py-2 text-sm text-text-secondary rounded-md hover:bg-surface-light hover:text-text-primary">Reorder Stages</button>
            <div className="my-1 border-t border-border-color"></div>
            <button onClick={handleActionClick(() => onCopyStage(stage.id))} className="w-full text-left block px-3 py-2 text-sm text-text-secondary rounded-md hover:bg-surface-light hover:text-text-primary">Copy Stage</button>
            <button onClick={handleActionClick(() => onSetStatus(stage.id, newStatus))} className="w-full text-left block px-3 py-2 text-sm text-text-secondary rounded-md hover:bg-surface-light hover:text-text-primary">Set Status {newStatus}</button>
            <button onClick={handleActionClick(onMoveAllTasks)} className="w-full text-left block px-3 py-2 text-sm text-text-secondary rounded-md hover:bg-surface-light hover:text-text-primary">Move all tasks</button>
            <div className="my-1 border-t border-border-color"></div>
            <button onClick={handleActionClick(() => onArchiveAllTasks(stage.id))} className="w-full text-left block px-3 py-2 text-sm text-text-secondary rounded-md hover:bg-surface-light hover:text-text-primary">Archive all tasks</button>
            <button onClick={handleActionClick(() => onArchiveStage(stage.id))} className="w-full text-left block px-3 py-2 text-sm text-red-400 rounded-md hover:bg-red-500/20">Archive this Stage</button>
        </div>
    );

    const SortView = (
        <div className="p-4">
             <div className="flex justify-between items-center mb-4">
                <button onClick={() => setView('main')} className="text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-surface-light"><ArrowLeftIcon className="h-5 w-5"/></button>
                <h3 className="font-semibold text-text-primary">Sort Options</h3>
                <button onClick={onClose} className="text-xl text-text-secondary hover:text-text-primary">&times;</button>
            </div>
            <div className="space-y-3 mb-4">
                {sortOptions.map(option => (
                    <label key={option.key} className="flex items-center gap-3 text-sm text-text-primary cursor-pointer p-2 rounded-md hover:bg-surface-light">
                        <input type="radio" name="sort-key" checked={sortConfig.key === option.key} onChange={() => setSortConfig(c => ({...c, key: option.key }))} className="h-4 w-4 text-primary bg-glass-light border-border-color focus:ring-primary focus:ring-offset-surface"/>
                        {option.label}
                    </label>
                ))}
            </div>
            <div className="flex bg-surface-light p-1 rounded-lg border border-border-color mb-4">
                <button onClick={() => setSortConfig(c => ({...c, direction: 'asc'}))} className={`flex-1 text-center text-sm py-1.5 rounded-md transition-colors ${sortConfig.direction === 'asc' ? 'bg-primary text-background font-semibold' : 'text-text-secondary'}`}>Ascending</button>
                <button onClick={() => setSortConfig(c => ({...c, direction: 'desc'}))} className={`flex-1 text-center text-sm py-1.5 rounded-md transition-colors ${sortConfig.direction === 'desc' ? 'bg-primary text-background font-semibold' : 'text-text-secondary'}`}>Descending</button>
            </div>
            <button onClick={handleApplySort} className="w-full px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Apply</button>
        </div>
    );

    const BackgroundView = (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setView('main')} className="text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-surface-light"><ArrowLeftIcon className="h-5 w-5"/></button>
                <h3 className="font-semibold text-text-primary">Stage Background</h3>
                <button onClick={onClose} className="text-xl text-text-secondary hover:text-text-primary">&times;</button>
            </div>
            <div className="grid grid-cols-5 gap-3">
                <button onClick={() => handlePatternSelect(undefined)} className={`w-full aspect-square rounded-lg border-2 flex items-center justify-center bg-surface-light transition-transform hover:scale-110 ${!stage.backgroundPattern ? 'border-primary' : 'border-transparent'}`} aria-label="No color"><CancelIcon className="h-6 w-6 text-text-secondary"/></button>
                {backgroundPatterns.map(pattern => (
                    <button
                        key={pattern.id}
                        onClick={() => handlePatternSelect(pattern.id)}
                        className={`w-full aspect-square rounded-lg border-2 bg-surface-light transition-transform hover:scale-110 ${stage.backgroundPattern === pattern.id ? 'border-primary' : 'border-transparent'}`}
                        style={pattern.style}
                        aria-label={`Set pattern to ${pattern.id}`}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <div 
            ref={popoverRef}
            className="z-30 w-72 bg-surface rounded-xl shadow-lg border border-border-color"
            style={style}
        >
            <div className="relative overflow-hidden h-[390px]">
                <div className={`w-full h-full absolute top-0 left-0 transition-transform duration-300 ease-in-out ${view === 'main' ? 'translate-x-0' : '-translate-x-full'}`}>
                    {MainView}
                </div>
                <div className={`w-full h-full absolute top-0 left-0 transition-transform duration-300 ease-in-out ${view === 'sort' ? 'translate-x-0' : 'translate-x-full'}`}>
                    {SortView}
                </div>
                <div className={`w-full h-full absolute top-0 left-0 transition-transform duration-300 ease-in-out ${view === 'background' ? 'translate-x-0' : 'translate-x-full'}`}>
                    {BackgroundView}
                </div>
            </div>
        </div>
    );
};

export default StageActionsPopover;