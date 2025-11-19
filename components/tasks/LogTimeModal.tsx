import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useTimer } from '../../contexts/TimerContext';
import { TimeLog } from '../../types';

interface LogTimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskModalClose: () => void;
    taskId: string;
}

const LogTimeModal: React.FC<LogTimeModalProps> = ({ isOpen, onClose, onTaskModalClose, taskId }) => {
    const { data, forceUpdate } = useData();
    const { startTimer, runningTimer } = useTimer();
    const [manualTime, setManualTime] = useState('');

    const handleStartTimer = () => {
        if (runningTimer) {
            alert('A timer is already running. Please stop it before starting a new one.');
            return;
        }
        startTimer(taskId);
        onTaskModalClose(); // Close the main task modal
    };
    
    const handleLogTime = () => {
        const parts = manualTime.toLowerCase().match(/(\d+h)?\s*(\d+m)?/);
        if (!parts) return;
        let totalSeconds = 0;
        if(parts[1]) totalSeconds += parseInt(parts[1]) * 3600;
        if(parts[2]) totalSeconds += parseInt(parts[2]) * 60;

        if (totalSeconds > 0) {
            const newLog: TimeLog = {
                id: `log-${Date.now()}`,
                taskId,
                userId: 'user-1', // Hardcoded user
                duration: totalSeconds,
                date: new Date().toISOString(),
            };
            data.time_logs.push(newLog);
            forceUpdate();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-glass w-full max-w-sm rounded-2xl shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-6">Log Time</h2>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Manual Entry</label>
                        <div className="flex gap-2">
                             <input 
                                type="text"
                                value={manualTime}
                                onChange={e => setManualTime(e.target.value)}
                                placeholder="e.g. 1h 30m"
                                className="appearance-none block w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary sm:text-sm"
                            />
                            <button onClick={handleLogTime} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Log</button>
                        </div>
                    </div>
                    
                    <div className="flex items-center">
                        <div className="flex-grow border-t border-border-color"></div>
                        <span className="flex-shrink mx-4 text-sm text-text-secondary">Or</span>
                        <div className="flex-grow border-t border-border-color"></div>
                    </div>

                    <button onClick={handleStartTimer} className="w-full px-4 py-3 bg-green-500/80 text-white text-sm font-bold rounded-lg hover:bg-green-500">
                        Start Timer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogTimeModal;
