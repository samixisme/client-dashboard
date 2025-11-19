import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { TimeLog } from '../types';
import { useData } from './DataContext';

interface RunningTimer {
    taskId: string;
    startTime: number; // timestamp
}

interface TimerContextType {
    runningTimer: RunningTimer | null;
    startTimer: (taskId: string) => void;
    stopTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { data, forceUpdate } = useData();
    const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(null);

    const startTimer = useCallback((taskId: string) => {
        if (runningTimer) {
            // In a real app, you might want to ask the user if they want to stop the current timer.
            // For now, we'll just log a warning and not start a new one.
            console.warn("Another timer is already running.");
            return;
        }
        setRunningTimer({ taskId, startTime: Date.now() });
    }, [runningTimer]);

    const stopTimer = useCallback(() => {
        if (!runningTimer) return;

        const durationInSeconds = Math.floor((Date.now() - runningTimer.startTime) / 1000);
        
        if (durationInSeconds > 0) {
            const newLog: TimeLog = {
                id: `log-${Date.now()}`,
                taskId: runningTimer.taskId,
                userId: 'user-1', // Hardcoded current user
                duration: durationInSeconds,
                date: new Date().toISOString(),
            };
            data.time_logs.push(newLog);
            forceUpdate(); // Notify consumers that data has changed
        }
        
        setRunningTimer(null);
    }, [runningTimer, data.time_logs, forceUpdate]);

    return (
        <TimerContext.Provider value={{ runningTimer, startTimer, stopTimer }}>
            {children}
        </TimerContext.Provider>
    );
};

export const useTimer = (): TimerContextType => {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error('useTimer must be used within a TimerProvider');
    }
    return context;
};
