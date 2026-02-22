import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, collectionGroup, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
    Brand, User, Project, Board, Stage, Task, Tag, TimeLog, RoadmapItem,
    Comment, Activity, Moodboard, MoodboardItem, FeedbackWebsite, FeedbackMockup,
    FeedbackVideo, FeedbackComment, EmailTemplate, CalendarEvent, SocialAccount,
    SocialPost, ScheduledPost, SocialAnomaly, Doc,
    Client, Invoice, Estimate, UserSettings,
} from '../types';
import { toast } from 'sonner';

// ─── Data Store (all-Firebase, no hardcoded mock data) ─────────────────────────
const dataStore = {
    dashboardWidgets: [] as { id: number; title: string; content: string; change: string }[],
    projects:          [] as Project[],
    boards:            [] as Board[],
    stages:            [] as Stage[],
    tasks:             [] as Task[],
    tags:              [] as Tag[],
    comments:          [] as Comment[],
    activities:        [] as Activity[],
    roadmapItems:      [] as RoadmapItem[],
    custom_fields:     [] as unknown[],
    board_notification_settings: [] as unknown[],
    users:             [] as User[],
    board_members:     [] as User[],
    brands:            [] as Brand[],
    clients:           [] as Client[],
    invoices:          [] as Invoice[],
    estimates:         [] as Estimate[],
    userSettings:      [] as UserSettings[],
    feedbackWebsites:  [] as FeedbackWebsite[],
    feedbackMockups:   [] as FeedbackMockup[],
    feedbackVideos:    [] as FeedbackVideo[],
    feedbackComments:  [] as FeedbackComment[],
    moodboards:        [] as Moodboard[],
    moodboardItems:    [] as MoodboardItem[],
    calendar_events:   [] as CalendarEvent[],
    calendarEvents:    [] as CalendarEvent[],
    time_logs:         [] as TimeLog[],
    emailTemplates:    [] as EmailTemplate[],
    socialAccounts:    [] as SocialAccount[],
    socialPosts:       [] as SocialPost[],
    scheduledPosts:    [] as ScheduledPost[],
    socialAnomalies:   [] as SocialAnomaly[],
    docs:              [] as Doc[],
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
    const [version, setVersion]   = useState(0);
    const [loading, setLoading]   = useState(true);
    const [error]                 = useState<Error | null>(null);
    const [user, setUser]         = useState<FirebaseUser | null>(null);

    // ── Auth listener ──────────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsub();
    }, []);

    // ── Firestore listeners (only after auth) ──────────────────────────────────
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        let unsubscribers: (() => void)[] = [];
        let isMounted = true;

        const startListeners = async () => {
            try {
                await user.getIdToken(true);
            } catch (err) {
                console.error('[DataContext] Failed to refresh auth token:', err);
                return;
            }

            if (!isMounted) return;
            setLoading(true);

            const bump = () => setVersion(v => v + 1);
            const errHandler = (label: string) => (err: Error) => {
                console.error(`[DataContext] ${label}:`, err);
                toast.error(`Error syncing ${label}`, { description: 'Please refresh the page' });
            };

            unsubscribers = [
                // ── Core entities ──────────────────────────────────────────────
                onSnapshot(
                    query(collection(db, 'brands'), orderBy('name')),
                    snap => { dataStore.brands = snap.docs.map(d => ({ id: d.id, ...d.data() } as Brand)); bump(); },
                    errHandler('brands')
                ),

                onSnapshot(
                    query(collection(db, 'users')),
                    snap => {
                        dataStore.users        = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
                        dataStore.board_members = dataStore.users;
                        bump();
                    },
                    errHandler('users')
                ),

                onSnapshot(
                    query(collection(db, 'projects'), orderBy('createdAt', 'desc')),
                    snap => { dataStore.projects = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)); bump(); },
                    errHandler('projects')
                ),

                onSnapshot(
                    query(collection(db, 'boards')),
                    snap => { dataStore.boards = snap.docs.map(d => ({ id: d.id, ...d.data() } as Board)); bump(); },
                    errHandler('boards')
                ),

                onSnapshot(
                    query(collection(db, 'stages')),
                    snap => {
                        const stages = snap.docs.map(d => ({ id: d.id, ...d.data() } as Stage));
                        stages.sort((a, b) => a.order - b.order);
                        dataStore.stages = stages;
                        bump();
                    },
                    errHandler('stages')
                ),

                onSnapshot(
                    query(collection(db, 'tasks')),
                    snap => { dataStore.tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)); bump(); },
                    errHandler('tasks')
                ),

                onSnapshot(
                    query(collection(db, 'tags')),
                    snap => { dataStore.tags = snap.docs.map(d => ({ id: d.id, ...d.data() } as Tag)); bump(); },
                    errHandler('tags')
                ),

                onSnapshot(
                    query(collection(db, 'time_logs')),
                    snap => { dataStore.time_logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as TimeLog)); bump(); },
                    errHandler('time_logs')
                ),

                onSnapshot(
                    query(collection(db, 'roadmap')),
                    snap => { dataStore.roadmapItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as RoadmapItem)); bump(); },
                    errHandler('roadmap')
                ),

                onSnapshot(
                    query(collection(db, 'comments')),
                    snap => { dataStore.comments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)); bump(); },
                    errHandler('comments')
                ),

                onSnapshot(
                    query(collection(db, 'activities')),
                    snap => { dataStore.activities = snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)); bump(); },
                    errHandler('activities')
                ),

                // ── Moodboards ─────────────────────────────────────────────────
                onSnapshot(
                    query(collection(db, 'moodboards')),
                    snap => {
                        dataStore.moodboards = snap.docs.map(d => ({ id: d.id, ...d.data() } as Moodboard));
                        bump();
                    },
                    errHandler('moodboards')
                ),

                onSnapshot(
                    query(collection(db, 'moodboard_items')),
                    snap => {
                        dataStore.moodboardItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as MoodboardItem));
                        bump();
                    },
                    errHandler('moodboard_items')
                ),

                // ── Feedback (collectionGroup — flat-root collections) ──────────
                onSnapshot(
                    query(collectionGroup(db, 'feedbackItems')),
                    snap => {
                        const items = snap.docs.map(d => {
                            const segs = d.ref.path.split('/');
                            return { id: d.id, projectId: segs[1], ...d.data() };
                        });
                        dataStore.feedbackWebsites = items.filter(
                            (i): i is FeedbackWebsite => (i as { type?: string }).type === 'website'
                        );
                        dataStore.feedbackMockups = items.filter(
                            (i): i is FeedbackMockup => (i as { type?: string }).type === 'mockup'
                        );
                        dataStore.feedbackVideos = items.filter(
                            (i): i is FeedbackVideo => (i as { type?: string }).type === 'video'
                        );
                        bump();
                    },
                    errHandler('feedbackItems')
                ),

                onSnapshot(
                    query(collection(db, 'feedbackComments')),
                    snap => {
                        dataStore.feedbackComments = snap.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackComment));
                        bump();
                    },
                    errHandler('feedbackComments')
                ),

                // ── Email Templates ────────────────────────────────────────────
                onSnapshot(
                    query(collection(db, 'emailTemplates')),
                    snap => { dataStore.emailTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() } as EmailTemplate)); bump(); },
                    errHandler('emailTemplates')
                ),

                // ── Calendar Events ────────────────────────────────────────────
                onSnapshot(
                    query(collection(db, 'calendar_events')),
                    snap => {
                        const events = snap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
                        dataStore.calendar_events = events;
                        dataStore.calendarEvents  = events;
                        bump();
                    },
                    errHandler('calendar_events')
                ),

                // ── Social ─────────────────────────────────────────────────────
                onSnapshot(
                    query(collection(db, 'social_accounts')),
                    snap => { dataStore.socialAccounts = snap.docs.map(d => ({ id: d.id, ...d.data() } as SocialAccount)); bump(); },
                    errHandler('social_accounts')
                ),

                onSnapshot(
                    query(collection(db, 'social_posts')),
                    snap => { dataStore.socialPosts = snap.docs.map(d => ({ id: d.id, ...d.data() } as SocialPost)); bump(); },
                    errHandler('social_posts')
                ),

                onSnapshot(
                    query(collection(db, 'scheduled_posts')),
                    snap => { dataStore.scheduledPosts = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduledPost)); bump(); },
                    errHandler('scheduled_posts')
                ),

                onSnapshot(
                    query(collection(db, 'social_anomalies')),
                    snap => { dataStore.socialAnomalies = snap.docs.map(d => ({ id: d.id, ...d.data() } as SocialAnomaly)); bump(); },
                    errHandler('social_anomalies')
                ),

                // ── Payments — clients / invoices / estimates / userSettings ───
                onSnapshot(
                    query(collection(db, 'clients')),
                    snap => { dataStore.clients = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)); bump(); },
                    errHandler('clients')
                ),

                onSnapshot(
                    query(collection(db, 'invoices'), orderBy('date', 'desc')),
                    snap => { dataStore.invoices = snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)); bump(); },
                    errHandler('invoices')
                ),

                onSnapshot(
                    query(collection(db, 'estimates'), orderBy('date', 'desc')),
                    snap => { dataStore.estimates = snap.docs.map(d => ({ id: d.id, ...d.data() } as Estimate)); bump(); },
                    errHandler('estimates')
                ),

                // userSettings is a single document per user, not a collection
                onSnapshot(
                    doc(db, 'userSettings', user.uid),
                    snap => {
                        if (snap.exists()) {
                            dataStore.userSettings = [{ userId: snap.id, ...snap.data() } as UserSettings];
                        } else {
                            dataStore.userSettings = [];
                        }
                        bump();
                    },
                    errHandler('userSettings')
                ),
            ];

            // Give listeners a moment to fire their first snapshots, then clear loading
            setTimeout(() => { if (isMounted) setLoading(false); }, 300);
        };

        startListeners();

        return () => {
            isMounted = false;
            unsubscribers.forEach(u => u());
        };
    }, [user]);

    const forceUpdate = useCallback(() => {
        setVersion(v => v + 1);
    }, []);

    const updateData = useCallback((key: DataStoreKey, newData: unknown[]) => {
        const current = dataStore[key];
        if (Array.isArray(current)) {
            current.length = 0;
            Array.prototype.push.apply(current, newData);
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
    if (!context) {
        // Safe fallback for components rendered outside the provider (e.g. Feedback widget)
        return {
            data: dataStore,
            loading: false,
            error: null,
            user: null,
            updateData: () => {},
            forceUpdate: () => {},
        };
    }
    return context;
};
