import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { TimeLog } from '../types';
import { useData } from './DataContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { toast } from 'sonner';

interface RunningTimer {
    taskId: string;
    startTime: number; // timestamp
}

interface TimerContextType {
    runningTimer: RunningTimer | null;
    startTimer: (taskId: string) => void;
    stopTimer: () => void;
}

export const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { data, forceUpdate } = useData();
    const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(null);

    const startTimer = useCallback((taskId: string) => {
        if (runningTimer) {
            console.warn("Another timer is already running.");
            return;
        }
        setRunningTimer({ taskId, startTime: Date.now() });
    }, [runningTimer]);

    const stopTimer = useCallback(async () => {
        if (!runningTimer) return;

        const durationInSeconds = Math.floor((Date.now() - runningTimer.startTime) / 1000);
        const taskId = runningTimer.taskId;
        
        if (durationInSeconds > 0) {
            const newLogData: Omit<TimeLog, 'id'> = {
                taskId: taskId,
                userId: 'user-1', // Hardcoded current user
                duration: durationInSeconds,
                date: new Date().toISOString(),
            };

            // Optimistic update
            const newLog: TimeLog = {
                id: `log-${Date.now()}`,
                ...newLogData
            };
            data.time_logs.push(newLog);
            forceUpdate();

            // Find Task Context (Project/Board) to save to Firestore
            // Since tasks are flattened in data.tasks, we can find the task there.
            const task = data.tasks.find(t => t.id === taskId);
            if (task && !taskId.startsWith('task-')) { // Check if it's a Firestore task
                const board = data.boards.find(b => b.id === task.boardId);
                const project = board ? data.projects.find(p => p.id === board.projectId) : undefined;

                if (project && board) {
                    try {
                        await addDoc(collection(db, 'projects', project.id, 'boards', board.id, 'tasks', taskId, 'time_logs'), newLogData);
                        toast.success('Time logged successfully!');
                    } catch (e) {
                        console.error("Error logging timer time to Firestore", e);
                        toast.error('Failed to log time');
                    }
                }
            }
        }
        
        setRunningTimer(null);
    }, [runningTimer, data.time_logs, data.tasks, data.boards, data.projects, forceUpdate]);

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
