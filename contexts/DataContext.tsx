import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Brand } from '../types';

// Import all data sources
import { projects as initialProjects, boards as initialBoards, stages as initialStages, tasks as initialTasks, tags as initialTags, comments as initialComments, activities as initialActivities, roadmapItems as initialRoadmapItems, custom_fields as initialCustomFields, board_notification_settings as initialBoardNotificationSettings, board_members as initialBoardMembers, time_logs as initialTimeLogs } from '../data/mockData';
import { clients as initialClients, invoices as initialInvoices, estimates as initialEstimates, userSettings as initialUserSettings } from '../data/paymentsData';
import { feedbackWebsites as initialFeedbackWebsites, feedbackMockups as initialFeedbackMockups, feedbackVideos as initialFeedbackVideos, feedbackComments as initialFeedbackComments } from '../data/feedbackData';
import { moodboards as initialMoodboards, moodboardItems as initialMoodboardItems } from '../data/moodboardData';
import { calendar_events as initialCalendarEvents } from '../data/calendarData';

const initialWidgets = [
  { id: 1, title: 'Total Revenue', content: '$45,231.89', change: '+20.1% from last month' },
  { id: 2, title: 'Subscriptions', content: '+2350', change: '+180.1% from last month' },
  { id: 3, title: 'Sales', content: '+12,234', change: '+19% from last month' },
  { id: 4, title: 'Active Now', content: '+573', change: '+201 since last hour' },
];

// This is a bit of a hack to make the mock data mutable and global.
// In a real app, this would be an API call and a state management library like Redux or Zustand.
const dataStore = {
    dashboardWidgets: initialWidgets,
    projects: initialProjects,
    boards: initialBoards,
    stages: initialStages,
    tasks: initialTasks,
    tags: initialTags,
    comments: initialComments,
    activities: initialActivities,
    roadmapItems: initialRoadmapItems,
    custom_fields: initialCustomFields,
    board_notification_settings: initialBoardNotificationSettings,
    board_members: initialBoardMembers,
    brands: [] as Brand[],
    clients: initialClients,
    invoices: initialInvoices,
    estimates: initialEstimates,
    userSettings: [initialUserSettings], // Admin panel works with arrays, so wrap it
    feedbackWebsites: initialFeedbackWebsites,
    feedbackMockups: initialFeedbackMockups,
    feedbackVideos: initialFeedbackVideos,
    feedbackComments: initialFeedbackComments,
    moodboards: initialMoodboards,
    moodboardItems: initialMoodboardItems,
    calendar_events: initialCalendarEvents,
    time_logs: initialTimeLogs,
};

type DataStoreKey = keyof typeof dataStore;

interface DataContextType {
    data: typeof dataStore;
    loading: boolean;
    error: Error | null;
    updateData: (key: DataStoreKey, newData: any[]) => void;
    forceUpdate: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [version, setVersion] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'brands'), orderBy('name'));

        const unsubscribeBrands = onSnapshot(q, (snapshot) => {
            try {
                const fetchedBrands = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Brand));
                dataStore.brands = fetchedBrands;
                setVersion(v => v + 1); // Trigger re-render
            } catch (err) {
                setError(err as Error);
                console.error("Error processing brand snapshot: ", err);
            } finally {
                setLoading(false);
            }
        }, (err) => {
            console.error("Error fetching brands: ", err);
            setError(err);
            setLoading(false);
        });

        // Placeholder for other listeners

        return () => {
            unsubscribeBrands();
            // Unsubscribe other listeners here
        };
    }, []);

    const forceUpdate = useCallback(() => {
        setVersion(v => v + 1);
    }, []);

    const updateData = useCallback((key: DataStoreKey, newData: any[]) => {
        const dataArray = dataStore[key];
        if (Array.isArray(dataArray)) {
            dataArray.length = 0;
            Array.prototype.push.apply(dataArray, newData);
        } else {
            (dataStore as any)[key] = newData[0]; 
        }
        forceUpdate();
    }, [forceUpdate]);

    return (
        <DataContext.Provider value={{ data: dataStore, loading, error, updateData, forceUpdate }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
