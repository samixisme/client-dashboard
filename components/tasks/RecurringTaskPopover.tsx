import React, { useState } from 'react';
import { RecurringTaskSettings } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DateTimePicker } from '../../src/components/ui/date-time-picker';
import { PopoverContent } from '../ui/popover';

interface RecurringTaskPopoverProps {
    settings: RecurringTaskSettings | undefined;
    onSave: (settings: RecurringTaskSettings | undefined) => void;
    boardId: string;
    onClose: () => void;
}

const RecurringTaskPopover: React.FC<RecurringTaskPopoverProps> = ({ settings, onSave, boardId, onClose }) => {
    const { data } = useData();

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
        <PopoverContent 
            align="center"
            side="bottom"
            sideOffset={8}
            className="w-96 p-6 space-y-4 bg-glass border-border-color rounded-2xl shadow-2xl z-50 overflow-hidden"
        >
            <h3 className="text-xl font-bold text-text-primary text-center">Recurring Task</h3>
            <div className="flex items-center bg-glass-light rounded-lg p-1 border border-border-color/50">
                {frequencyOptions.map(freq => (
                    <button key={freq} onClick={() => setLocalSettings(s => ({...s, frequency: freq}))} className={`flex-1 text-center text-sm py-1.5 rounded-md cursor-pointer transition-colors ${localSettings.frequency === freq ? 'bg-primary text-background font-semibold shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
                       {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                ))}
            </div>

            <div className="pt-2 border-t border-border-color/30">
                <label className="block text-sm font-medium text-text-secondary mb-2">Next Due Date & Time</label>
                <DateTimePicker
                    value={nextDueDateTime}
                    onChange={setNextDueDateTime}
                    placeholder="Select date and time"
                    showTime={true}
                />
            </div>
            
            <div className="flex items-center gap-3 pt-2">
                <label className="text-sm font-medium text-text-secondary">Repeat every</label>
                <input type="number" min="1" value={localSettings.interval} onChange={e => setLocalSettings(s => ({...s, interval: parseInt(e.target.value) || 1}))} className="w-16 px-2 py-1.5 border border-border-color bg-glass-light rounded-lg text-sm text-center text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/50" />
                 <span className="text-sm text-text-secondary">{localSettings.frequency?.slice(0,-2)}(s)</span>
            </div>
            
            <div className="pt-2">
                 <label className="block text-sm font-medium text-text-secondary mb-2">Repeat task in stage</label>
                <select value={localSettings.repeatInStageId} onChange={e => setLocalSettings(s => ({...s, repeatInStageId: e.target.value}))} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm cursor-pointer">
                    {boardStages.map(stage => <option key={stage.id} value={stage.id} className="bg-surface">{stage.name}</option>)}
                </select>
            </div>

            <div className="space-y-3 pt-4 border-t border-border-color/30">
                <CheckboxField label="Repeat only when completed" checked={!!localSettings.repeatOnlyWhenCompleted} onChange={e => setLocalSettings(s => ({...s, repeatOnlyWhenCompleted: e.target.checked}))} />
                <CheckboxField label="Create a task when repeating" checked={true} onChange={() => {}} disabled={true} />
            </div>
            
            <div className="flex justify-between items-center pt-5">
                {settings && <button onClick={handleRemove} className="text-sm font-medium text-red-400 hover:text-red-300 hover:underline transition-colors px-2 py-1">Remove</button>}
                <button onClick={handleSave} className="px-6 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all ml-auto">Set Schedule</button>
            </div>
        </PopoverContent>
    );
};

const CheckboxField = (props: React.InputHTMLAttributes<HTMLInputElement> & {label: string}) => (
     <label className={`flex items-center gap-3 text-sm cursor-pointer transition-opacity ${props.disabled ? 'opacity-50' : 'hover:opacity-80 text-text-primary'}`}>
        <input type="checkbox" {...props} className="h-4 w-4 rounded bg-glass-light border-border-color text-primary focus:ring-primary/50 cursor-pointer"/>
        {props.label}
    </label>
);

export default RecurringTaskPopover;
