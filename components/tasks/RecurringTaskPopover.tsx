import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { RecurringTaskSettings, Stage } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DateTimePicker } from '../../src/components/ui/date-time-picker';

interface RecurringTaskPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    anchorEl: HTMLElement | null;
    settings: RecurringTaskSettings | undefined;
    onSave: (settings: RecurringTaskSettings | undefined) => void;
    boardId: string;
}

const RecurringTaskPopover: React.FC<RecurringTaskPopoverProps> = ({ isOpen, onClose, anchorEl, settings, onSave, boardId }) => {
    const { data } = useData();
    const popoverRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});

    const [localSettings, setLocalSettings] = useState<Partial<RecurringTaskSettings>>(
        settings || {
            frequency: 'daily',
            interval: 1,
            repeatInStageId: '',
            repeatOnlyWhenCompleted: false
        }
    );
    const [nextDueDateTime, setNextDueDateTime] = useState<Date | undefined>(
        settings?.nextDueDate ? new Date(settings.nextDueDate) : undefined
    );

    const boardStages = data.stages.filter(s => s.boardId === boardId);

    useLayoutEffect(() => {
        if (isOpen && anchorEl && popoverRef.current) {
            const rect = anchorEl.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect();
            
            let top = rect.bottom + 8;
            let left = rect.left + rect.width / 2 - popoverRect.width / 2;

            // Adjust if it goes off the right edge
            if (left + popoverRect.width > window.innerWidth - 16) {
                left = window.innerWidth - popoverRect.width - 16;
            }
            // Adjust if it goes off the left edge
            if (left < 16) {
                left = 16;
            }
             // Adjust if it goes off bottom edge
            if (top + popoverRect.height > window.innerHeight - 16) {
                top = rect.top - popoverRect.height - 8;
            }

            setStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
            });
        }
    }, [isOpen, anchorEl]);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);
    
    if (!isOpen || !anchorEl) return null;

    const handleSave = () => {
        if (!nextDueDateTime) return;
        onSave({
            ...localSettings,
            nextDueDate: nextDueDateTime.toISOString(),
        } as RecurringTaskSettings);
        onClose();
    };
    
    const handleRemove = () => {
        onSave(undefined);
        onClose();
    }

    const frequencyOptions: RecurringTaskSettings['frequency'][] = ['daily', 'weekly', 'monthly', 'yearly'];
    
    return (
        <div className="fixed inset-0 z-40" onClick={onClose}>
            <div 
                ref={popoverRef}
                style={style} 
                className="z-50 bg-surface w-96 rounded-2xl shadow-xl border border-border-color p-6 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-xl font-bold text-text-primary text-center">Recurring Task</h3>
                <div className="flex items-center bg-glass rounded-lg p-1 border border-border-color">
                    {frequencyOptions.map(freq => (
                        <button key={freq} onClick={() => setLocalSettings(s => ({...s, frequency: freq}))} className={`flex-1 text-center text-sm py-1.5 rounded-md ${localSettings.frequency === freq ? 'bg-primary text-background font-semibold' : 'text-text-secondary'}`}>
                           {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </button>
                    ))}
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Next Due Date & Time</label>
                    <DateTimePicker
                        value={nextDueDateTime}
                        onChange={setNextDueDateTime}
                        placeholder="Select date and time"
                        showTime={true}
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-text-secondary">Repeat every</label>
                    <input type="number" min="1" value={localSettings.interval} onChange={e => setLocalSettings(s => ({...s, interval: parseInt(e.target.value) || 1}))} className="w-16 px-2 py-1 border border-border-color bg-glass-light rounded-lg text-sm" />
                     <span className="text-sm text-text-secondary">{localSettings.frequency?.slice(0,-2)}(s)</span>
                </div>
                
                <div>
                     <label className="block text-sm font-medium text-text-secondary mb-1">Repeat task in stage</label>
                    <select value={localSettings.repeatInStageId} onChange={e => setLocalSettings(s => ({...s, repeatInStageId: e.target.value}))} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary text-sm">
                        {boardStages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                    </select>
                </div>

                <div className="space-y-2 pt-2">
                    <CheckboxField label="Repeat only when completed" checked={!!localSettings.repeatOnlyWhenCompleted} onChange={e => setLocalSettings(s => ({...s, repeatOnlyWhenCompleted: e.target.checked}))} />
                    <CheckboxField label="Create a task when repeating" checked={true} onChange={() => {}} disabled={true} />
                </div>
                
                <div className="flex justify-between items-center pt-4">
                    {settings && <button onClick={handleRemove} className="text-sm font-medium text-red-400 hover:underline">Remove</button>}
                    <button onClick={handleSave} className="px-6 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover ml-auto">Set</button>
                </div>
            </div>
        </div>
    );
};

const InputField = (props: React.InputHTMLAttributes<HTMLInputElement> & {label: string}) => (
    <div className="flex-1">
        <label className="block text-sm font-medium text-text-secondary mb-1">{props.label}</label>
        <input {...props} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary text-sm" />
    </div>
);

const CheckboxField = (props: React.InputHTMLAttributes<HTMLInputElement> & {label: string}) => (
     <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
        <input type="checkbox" {...props} className="h-4 w-4 rounded bg-glass-light border-border-color text-primary focus:ring-primary disabled:opacity-50"/>
        {props.label}
    </label>
);

export default RecurringTaskPopover;
