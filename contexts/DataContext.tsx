
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, collectionGroup } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Brand, User, Project, Board, Stage, Task, Tag, TimeLog, RoadmapItem, Comment, Activity, Moodboard, MoodboardItem, FeedbackWebsite, FeedbackMockup, FeedbackVideo, FeedbackComment, EmailTemplate } from '../types';
import { toast } from 'sonner';

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
    board_members: initialUsers, // Alias for users, used in some components
    emailTemplates: [] as EmailTemplate[],
};

type DataStoreKey = keyof typeof dataStore;

interface DataContextType {
    data: typeof dataStore;
    loading: boolean;
    error: Error | null;
    user: FirebaseUser | null;
    updateData: (key: DataStoreKey, newData: unknown[]) => void;
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
        // Don't query Firestore until user is authenticated
        if (!user) {
            setLoading(false);
            return;
        }

        let unsubscribers: (() => void)[] = [];
        let isMounted = true;

        const startListeners = async () => {
            try {
                // Force token refresh to ensure Firestore has valid credentials
                await user.getIdToken(true);
            } catch (err) {
                console.error("[DataContext] Failed to get auth token:", err);
                return;
            }

            if (!isMounted) return;

            setLoading(true);
            const qBrands = query(collection(db, 'brands'), orderBy('name'));
            const qUsers = query(collection(db, 'users'));
            const qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));

            // Use root-level collections instead of collectionGroup
            // collectionGroup requires special index configuration
            const qBoards = query(collection(db, 'boards'));
            const qStages = query(collection(db, 'stages'));
            const qTasks = query(collection(db, 'tasks'));
            const qTags = query(collection(db, 'tags'));
            const qTimeLogs = query(collection(db, 'time_logs'));
            const qRoadmapItems = query(collection(db, 'roadmap'));
            const qComments = query(collection(db, 'comments'));
            const qActivities = query(collection(db, 'activities'));
            const qMoodboards = query(collection(db, 'moodboards'));
            const qMoodboardItems = query(collection(db, 'moodboard_items'));
            const qFeedbackItems = query(collection(db, 'feedbackItems'));
            const qFeedbackComments = query(collection(db, 'feedbackComments'));
            const qEmailTemplates = query(collection(db, 'emailTemplates'));

            unsubscribers = [
            onSnapshot(qBrands, (snapshot) => {
                dataStore.brands = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Brand));
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching brands: ", err);
                toast.error('Error syncing brands data', { description: 'Please refresh the page' });
            }),

            onSnapshot(qUsers, (snapshot) => {
                const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                dataStore.users = [...initialUsers, ...fetchedUsers];
                dataStore.board_members = dataStore.users; // Sync alias
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching users: ", err);
                toast.error('Error syncing users data', { description: 'Please refresh the page' });
            }),

            onSnapshot(qProjects, (snapshot) => {
                const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
                dataStore.projects = [...initialProjects, ...fetchedProjects];
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching projects: ", err);
                toast.error('Error syncing projects data', { description: 'Please refresh the page' });
            }),

            onSnapshot(qBoards, (snapshot) => {
                const fetchedBoards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
                dataStore.boards = [...initialBoards, ...fetchedBoards];
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching boards: ", err);
                toast.error('Error syncing boards data', { description: 'Please refresh the page' });
            }),

            onSnapshot(qStages, (snapshot) => {
                const fetchedStages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stage));
                fetchedStages.sort((a, b) => a.order - b.order);
                dataStore.stages = [...initialStages, ...fetchedStages];
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching stages: ", err);
                toast.error('Error syncing stages data', { description: 'Please refresh the page' });
            }),

            onSnapshot(qTasks, (snapshot) => {
                const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
                dataStore.tasks = [...initialTasks, ...fetchedTasks];
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching tasks: ", err);
                toast.error('Error syncing tasks data', { description: 'Please refresh the page' });
            }),

            onSnapshot(qTags, (snapshot) => {
                const fetchedTags = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
                dataStore.tags = [...initialTags, ...fetchedTags];
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching tags: ", err);
                toast.error('Error syncing tags data', { description: 'Please refresh the page' });
            }),

            onSnapshot(qTimeLogs, (snapshot) => {
                const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeLog));
                dataStore.time_logs = [...initialTimeLogs, ...fetchedLogs];
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching time logs: ", err);
                toast.error('Error syncing time logs', { description: 'Please refresh the page' });
            }),

            onSnapshot(qRoadmapItems, (snapshot) => {
                const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoadmapItem));
                dataStore.roadmapItems = [...initialRoadmapItems, ...fetchedItems];
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching roadmap items: ", err);
                toast.error('Error syncing roadmap items', { description: 'Please refresh the page' });
            }),
            
            onSnapshot(qComments, (snapshot) => {
                const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
                dataStore.comments = [...initialComments, ...fetchedComments];
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching comments: ", err);
                toast.error('Error syncing comments', { description: 'Please refresh the page' });
            }),

            onSnapshot(qActivities, (snapshot) => {
                const fetchedActivities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
                dataStore.activities = [...initialActivities, ...fetchedActivities];
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching activities: ", err);
                toast.error('Error syncing activities', { description: 'Please refresh the page' });
            }),

            onSnapshot(qMoodboards, (snapshot) => {
                const fetchedMoodboards = snapshot.docs.map(doc => {
                    // Extract projectId from path projects/{projectId}/moodboards/{moodboardId}
                    const pathSegments = doc.ref.path.split('/');
                    const projectId = pathSegments[1];
                    return { id: doc.id, projectId, ...doc.data() } as Moodboard;
                });
                dataStore.moodboards = [...initialMoodboards, ...fetchedMoodboards];
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching moodboards: ", err);
                toast.error('Error syncing moodboards', { description: 'Please refresh the page' });
            }),

            onSnapshot(qMoodboardItems, (snapshot) => {
                const fetchedItems = snapshot.docs.map(doc => {
                    // Extract moodboardId from path projects/{pid}/moodboards/{mid}/moodboard_items/{iid}
                    const pathSegments = doc.ref.path.split('/');
                    const moodboardId = pathSegments[3];
                    return { id: doc.id, moodboardId, ...doc.data() } as MoodboardItem;
                });
                dataStore.moodboardItems = [...initialMoodboardItems, ...fetchedItems];
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching moodboard items: ", err);
                toast.error('Error syncing moodboard items', { description: 'Please refresh the page' });
            }),

            // Corrected: Listen to the single 'feedbackItems' collectionGroup
            onSnapshot(query(collectionGroup(db, 'feedbackItems')), (snapshot) => {
                const fetchedItems = snapshot.docs.map(doc => {
                     const pathSegments = doc.ref.path.split('/');
                     const projectId = pathSegments[1];
                     const data = doc.data();
                     return { id: doc.id, projectId, ...data };
                });

                // Distribute to specific arrays based on type
                dataStore.feedbackWebsites = [...initialFeedbackWebsites, ...fetchedItems.filter((i): i is FeedbackWebsite => (i as {type?: string}).type === 'website')] as FeedbackWebsite[];
                dataStore.feedbackMockups = [...initialFeedbackMockups, ...fetchedItems.filter((i): i is FeedbackMockup => (i as {type?: string}).type === 'mockup')] as FeedbackMockup[];
                dataStore.feedbackVideos = [...initialFeedbackVideos, ...fetchedItems.filter((i): i is FeedbackVideo => (i as {type?: string}).type === 'video')] as FeedbackVideo[];

                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching feedback items: ", err);
                toast.error('Error syncing feedback items', { description: 'Please refresh the page' });
            }),

            // Listen to comments (feedback items subcollection)
            onSnapshot(query(collectionGroup(db, 'comments')), (snapshot) => {
                 const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedbackComment));
                 // Filter to ensure we only get feedback comments if 'comments' is reused elsewhere?
                 // For now, assume global comments are feedback comments or compatible.
                 dataStore.feedbackComments = [...initialFeedbackComments, ...fetchedItems];
                 setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching feedback comments: ", err);
                toast.error('Error syncing feedback comments', { description: 'Please refresh the page' });
            }),

            // Email Templates listener
            onSnapshot(qEmailTemplates, (snapshot) => {
                const fetchedTemplates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailTemplate));
                dataStore.emailTemplates = fetchedTemplates;
                setVersion(v => v + 1);
            }, (err) => {
                console.error("Error fetching email templates: ", err);
                toast.error('Error syncing email templates', { description: 'Please refresh the page' });
            }),
        ];

            Promise.all(unsubscribers.map(() => new Promise(res => setTimeout(res, 200)))).finally(() => {
                if (isMounted) setLoading(false);
            });
        };

        startListeners();

        return () => {
            isMounted = false;
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user]);

    const forceUpdate = useCallback(() => {
        setVersion(v => v + 1);
    }, []);

    const updateData = useCallback((key: DataStoreKey, newData: unknown[]) => {
        const dataArray = dataStore[key];
        if (Array.isArray(dataArray)) {
            dataArray.length = 0;
            Array.prototype.push.apply(dataArray, newData);
        } else {
            (dataStore as Record<string, unknown>)[key] = newData[0];
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
    // Modified to return a mock context if used outside of provider (e.g., in Feedback Tool)
    if (!context) {
        // Return a minimal safe context
        return {
            data: dataStore, // Return the static dataStore which might have some mock data
            loading: false,
            error: null,
            user: null,
            updateData: () => {},
            forceUpdate: () => {}
        };
    }
    return context;
};
