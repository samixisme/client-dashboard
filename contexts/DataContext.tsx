
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, collectionGroup } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Brand, User, Project, Board, Stage, Task, Tag, TimeLog, RoadmapItem, Comment, Activity } from '../types';

// Import all data sources
import { projects as initialProjects, boards as initialBoards, stages as initialStages, tasks as initialTasks, tags as initialTags, comments as initialComments, activities as initialActivities, roadmapItems as initialRoadmapItems, custom_fields as initialCustomFields, board_notification_settings as initialBoardNotificationSettings, users as initialUsers, time_logs as initialTimeLogs } from '../data/mockData';
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
    users: initialUsers,
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
    user: FirebaseUser | null;
    updateData: (key: DataStoreKey, newData: any[]) => void;
    forceUpdate: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [version, setVersion] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [user, setUser] = useState<FirebaseUser | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        setLoading(true);
        const qBrands = query(collection(db, 'brands'), orderBy('name'));
        const qUsers = query(collection(db, 'users'));
        const qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
        
        // Use collectionGroup to query subcollections across all projects
        const qBoards = query(collectionGroup(db, 'boards'));
        const qStages = query(collectionGroup(db, 'stages'));
        const qTasks = query(collectionGroup(db, 'tasks'));
        const qTags = query(collectionGroup(db, 'tags'));
        const qTimeLogs = query(collectionGroup(db, 'time_logs'));
        const qRoadmapItems = query(collectionGroup(db, 'roadmap'));
        const qComments = query(collectionGroup(db, 'comments'));
        const qActivities = query(collectionGroup(db, 'activities'));

        const unsubscribers = [
            onSnapshot(qBrands, (snapshot) => {
                dataStore.brands = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Brand));
                setVersion(v => v + 1);
            }, (err) => console.error("Error fetching brands: ", err)),

            onSnapshot(qUsers, (snapshot) => {
                const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                dataStore.users = [...initialUsers, ...fetchedUsers];
                setVersion(v => v + 1);
            }, (err) => console.error("Error fetching users: ", err)),

            onSnapshot(qProjects, (snapshot) => {
                const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
                dataStore.projects = [...initialProjects, ...fetchedProjects];
                setVersion(v => v + 1);
            }, (err) => console.error("Error fetching projects: ", err)),

            onSnapshot(qBoards, (snapshot) => {
                const fetchedBoards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
                dataStore.boards = [...initialBoards, ...fetchedBoards];
                setVersion(v => v + 1);
            }, (err) => console.error("Error fetching boards: ", err)),

            onSnapshot(qStages, (snapshot) => {
                const fetchedStages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stage));
                fetchedStages.sort((a, b) => a.order - b.order);
                dataStore.stages = [...initialStages, ...fetchedStages];
                setVersion(v => v + 1);
            }, (err) => console.error("Error fetching stages: ", err)),

            onSnapshot(qTasks, (snapshot) => {
                const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
                dataStore.tasks = [...initialTasks, ...fetchedTasks];
                setVersion(v => v + 1);
            }, (err) => console.error("Error fetching tasks: ", err)),

            onSnapshot(qTags, (snapshot) => {
                const fetchedTags = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
                dataStore.tags = [...initialTags, ...fetchedTags];
                setVersion(v => v + 1);
            }, (err) => console.error("Error fetching tags: ", err)),

            onSnapshot(qTimeLogs, (snapshot) => {
                const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeLog));
                dataStore.time_logs = [...initialTimeLogs, ...fetchedLogs];
                setVersion(v => v + 1);
            }, (err) => console.error("Error fetching time logs: ", err)),

            onSnapshot(qRoadmapItems, (snapshot) => {
                const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoadmapItem));
                dataStore.roadmapItems = [...initialRoadmapItems, ...fetchedItems];
                setVersion(v => v + 1);
            }, (err) => console.error("Error fetching roadmap items: ", err)),
            
            onSnapshot(qComments, (snapshot) => {
                const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
                dataStore.comments = [...initialComments, ...fetchedComments];
                setVersion(v => v + 1);
            }, (err) => console.error("Error fetching comments: ", err)),

            onSnapshot(qActivities, (snapshot) => {
                const fetchedActivities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
                dataStore.activities = [...initialActivities, ...fetchedActivities];
                setVersion(v => v + 1);
            }, (err) => console.error("Error fetching activities: ", err)),
        ];

        Promise.all(unsubscribers.map(unsub => new Promise(res => setTimeout(res, 200)))).finally(() => setLoading(false));

        return () => {
            unsubscribers.forEach(unsub => unsub());
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
        <DataContext.Provider value={{ data: dataStore, loading, error, updateData, forceUpdate, user }}>
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
