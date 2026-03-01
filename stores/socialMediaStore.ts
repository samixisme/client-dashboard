import { create } from 'zustand';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    addDoc,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import {
    SocialAccount,
    SocialPost,
    PlatformOverview,
    SocialAnomaly,
    ScheduledPost,
    EngagementInsight,
    SocialDashboardFilters,
    SocialPlatform,
} from '../types';
import { SOCIAL_COLLECTIONS, seedAccounts } from '../data/socialMediaData';

type ActiveTab = 'overview' | 'analytics' | 'schedule' | 'anomalies' | 'accounts';

interface SocialMediaState {
    accounts: SocialAccount[];
    posts: SocialPost[];
    overviews: PlatformOverview[];
    anomalies: SocialAnomaly[];
    scheduledPosts: ScheduledPost[];
    engagementInsights: EngagementInsight[];
    filters: SocialDashboardFilters;
    activeTab: ActiveTab;
    selectedAccountId: string | null;
    loading: boolean;
    error: string | null;

    // Actions
    setFilters: (filters: Partial<SocialDashboardFilters>) => void;
    setActiveTab: (tab: ActiveTab) => void;
    selectAccount: (accountId: string | null) => void;
    markAnomalyRead: (anomalyId: string) => Promise<void>;
    addScheduledPost: (post: Omit<ScheduledPost, 'id' | 'createdAt'>) => Promise<void>;
    cancelScheduledPost: (postId: string) => Promise<void>;
    addAccount: (account: Omit<SocialAccount, 'id'>) => Promise<string>;
    updateAccount: (id: string, data: Partial<SocialAccount>) => Promise<void>;
    removeAccount: (id: string) => Promise<void>;
    deleteScheduledPost: (postId: string) => Promise<void>;
    publishScheduledPost: (postId: string) => Promise<void>;
    updateScheduledPost: (postId: string, data: Partial<ScheduledPost>) => Promise<void>;
    dismissAnomaly: (anomalyId: string) => Promise<void>;

    // Firebase listeners
    initListeners: () => Unsubscribe[];
    initializeSeedData: () => Promise<void>;
}

export const useSocialMediaStore = create<SocialMediaState>((set, get) => ({
    accounts: [],
    posts: [],
    overviews: [],
    anomalies: [],
    scheduledPosts: [],
    engagementInsights: [],
    filters: { platforms: [], dateRange: 'last30days' },
    activeTab: 'overview',
    selectedAccountId: null,
    loading: true,
    error: null,

    setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters },
    })),

    setActiveTab: (tab) => set({ activeTab: tab }),

    selectAccount: (accountId) => set({ selectedAccountId: accountId }),

    markAnomalyRead: async (anomalyId) => {
        set({ error: null });
        try {
            await updateDoc(doc(db, SOCIAL_COLLECTIONS.anomalies, anomalyId), { isRead: true });
        } catch (error: any) {
            set({ error: `Failed to mark anomaly read: ${error.message}` });
        }
    },

    addScheduledPost: async (post) => {
        set({ error: null });
        try {
            const id = `sp-${Date.now()}`;
            const fullPost: ScheduledPost = {
                ...post,
                id,
                createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, SOCIAL_COLLECTIONS.scheduledPosts, id), fullPost);
        } catch (error: any) {
            set({ error: `Failed to schedule post: ${error.message}` });
        }
    },

    cancelScheduledPost: async (postId) => {
        set({ error: null });
        try {
            await updateDoc(doc(db, SOCIAL_COLLECTIONS.scheduledPosts, postId), {
                status: 'cancelled',
            });
        } catch (error: any) {
            set({ error: `Failed to cancel post: ${error.message}` });
        }
    },

    addAccount: async (account) => {
        set({ error: null });
        const id = `${account.platform}-${Date.now()}`;
        const fullAccount: SocialAccount = { ...account, id };
        await setDoc(doc(db, SOCIAL_COLLECTIONS.accounts, id), fullAccount);
        return id;
    },

    updateAccount: async (id, data) => {
        set({ error: null });
        await updateDoc(doc(db, SOCIAL_COLLECTIONS.accounts, id), data);
    },

    removeAccount: async (id) => {
        set({ error: null });
        await deleteDoc(doc(db, SOCIAL_COLLECTIONS.accounts, id));
    },

    deleteScheduledPost: async (postId) => {
        set({ error: null });
        try {
            await deleteDoc(doc(db, SOCIAL_COLLECTIONS.scheduledPosts, postId));
        } catch (error: any) {
            set({ error: `Failed to delete scheduled post: ${error.message}` });
        }
    },

    publishScheduledPost: async (postId) => {
        set({ error: null });
        try {
            await updateDoc(doc(db, SOCIAL_COLLECTIONS.scheduledPosts, postId), {
                status: 'published',
            });
        } catch (error: any) {
            set({ error: `Failed to publish post: ${error.message}` });
        }
    },

    updateScheduledPost: async (postId, data) => {
        set({ error: null });
        try {
            await updateDoc(doc(db, SOCIAL_COLLECTIONS.scheduledPosts, postId), data);
        } catch (error: any) {
            set({ error: `Failed to update scheduled post: ${error.message}` });
        }
    },

    dismissAnomaly: async (anomalyId) => {
        set({ error: null });
        try {
            await updateDoc(doc(db, SOCIAL_COLLECTIONS.anomalies, anomalyId), {
                isRead: true,
                dismissed: true,
            });
        } catch (error: any) {
            set({ error: `Failed to dismiss anomaly: ${error.message}` });
        }
    },

    initializeSeedData: async () => {
        set({ error: null });
        try {
            // Check if socialAccounts collection is empty
            const accountsSnapshot = await getDocs(collection(db, SOCIAL_COLLECTIONS.accounts));

            if (accountsSnapshot.empty) {
                // Add each seed account to Firestore
                for (const account of seedAccounts) {
                    await addDoc(collection(db, SOCIAL_COLLECTIONS.accounts), {
                        ...account,
                        createdAt: new Date().toISOString(),
                        lastSynced: '',
                    });
                }
            }
        } catch {
            // Seeding failed — listeners will still work with empty state
        }
    },

    initListeners: () => {
        // Seed Firestore if empty (runs async, won't block listeners)
        get().initializeSeedData();

        const unsubscribes: Unsubscribe[] = [];

        // Accounts
        unsubscribes.push(
            onSnapshot(collection(db, SOCIAL_COLLECTIONS.accounts), (snap) => {
                const accounts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SocialAccount));
                set({ accounts, loading: false });
            }, (err) => set({ error: err.message, loading: false }))
        );

        // Posts
        unsubscribes.push(
            onSnapshot(
                query(collection(db, SOCIAL_COLLECTIONS.posts), orderBy('publishedAt', 'desc')),
                (snap) => {
                    const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SocialPost));
                    set({ posts });
                },
                (err) => set({ error: err.message })
            )
        );

        // Overviews
        unsubscribes.push(
            onSnapshot(collection(db, SOCIAL_COLLECTIONS.overviews), (snap) => {
                const overviews = snap.docs.map((d) => ({ ...d.data() } as PlatformOverview));
                set({ overviews });
            })
        );

        // Anomalies
        unsubscribes.push(
            onSnapshot(
                query(collection(db, SOCIAL_COLLECTIONS.anomalies), orderBy('detectedAt', 'desc')),
                (snap) => {
                    const anomalies = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SocialAnomaly));
                    set({ anomalies });
                }
            )
        );

        // Scheduled Posts
        unsubscribes.push(
            onSnapshot(
                query(collection(db, SOCIAL_COLLECTIONS.scheduledPosts), orderBy('scheduledFor', 'asc')),
                (snap) => {
                    const scheduledPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScheduledPost));
                    set({ scheduledPosts });
                }
            )
        );

        // Engagement Insights
        unsubscribes.push(
            onSnapshot(
                query(collection(db, SOCIAL_COLLECTIONS.insights), orderBy('date', 'asc')),
                (snap) => {
                    const engagementInsights = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EngagementInsight));
                    set({ engagementInsights });
                }
            )
        );

        return unsubscribes;
    },
}));
