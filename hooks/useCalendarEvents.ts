import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../utils/firebase';
import { collection, query, where, onSnapshot, collectionGroup, Timestamp, orderBy } from 'firebase/firestore';
import { CalendarEvent, Task, Invoice, RoadmapItem, Project, Board, Client, FeedbackComment, Brand } from '../types';

export const useCalendarEvents = (userId: string) => {
    const [manualEvents, setManualEvents] = useState<CalendarEvent[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [boards, setBoards] = useState<Board[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [feedbackComments, setFeedbackComments] = useState<FeedbackComment[]>([]);
    const [loading, setLoading] = useState(true);

    const ensureDateString = (date: string | Date | Timestamp | { toDate: () => Date } | undefined): string => {
        if (!date) return '';
        if (typeof date === 'string') return date;
        if (date instanceof Timestamp) return date.toDate().toISOString();
        if ('toDate' in date && typeof date.toDate === 'function') return date.toDate().toISOString(); // Handle object-like timestamps
        if (date instanceof Date) return date.toISOString();
        return String(date);
    };
    const [brandsList, setBrandsList] = useState<Brand[]>([]);

    useEffect(() => {
        const unsubscribeFunctions: (() => void)[] = [];

        // 0. Brands
        const brandsQuery = query(collection(db, 'brands'));
        unsubscribeFunctions.push(onSnapshot(brandsQuery, (snapshot) => {
            setBrandsList(snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name || '',
                createdAt: doc.data().createdAt || new Date(),
                ...doc.data()
            } as Brand)));
        }));

        // 1. Projects
        const authProjectsQuery = query(collection(db, 'projects')); 
        unsubscribeFunctions.push(onSnapshot(authProjectsQuery, (snapshot) => {
            const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            setProjects(fetchedProjects);
        }));

        // 2. Boards
        const boardsQuery = query(collectionGroup(db, 'boards'));
        unsubscribeFunctions.push(onSnapshot(boardsQuery, (snapshot) => {
            const fetchedBoards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
            setBoards(fetchedBoards);
        }));

        // 3. Manual Events
        const manualQuery = query(collection(db, 'calendar_events'));
        unsubscribeFunctions.push(onSnapshot(manualQuery, (snapshot) => {
            const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
            setManualEvents(events);
        }));

        // 4. Tasks - Fetch all tasks, filter for dueDate in memory to avoid index requirement
        const tasksQuery = query(collectionGroup(db, 'tasks'));
        unsubscribeFunctions.push(onSnapshot(tasksQuery, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setTasks(fetchedTasks);
        }));

        // 5. Invoices
        const invoicesQuery = query(collection(db, 'invoices'));
        unsubscribeFunctions.push(onSnapshot(invoicesQuery, (snapshot) => {
             const fetchedInvoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
             setInvoices(fetchedInvoices);
        }));

        // 6. Roadmap Items
        const roadmapQuery = query(collectionGroup(db, 'roadmap'));
        unsubscribeFunctions.push(onSnapshot(roadmapQuery, (snapshot) => {
             const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoadmapItem));
              setRoadmapItems(items);
        }));

        // 6.5 Clients
        const clientsQuery = query(collection(db, 'clients'));
        unsubscribeFunctions.push(onSnapshot(clientsQuery, (snapshot) => {
            setClients(snapshot.docs.map(doc => ({
                id: doc.id,
                userId: doc.data().userId || '',
                name: doc.data().name || '',
                adresse: doc.data().adresse || '',
                ice: doc.data().ice || '',
                rc: doc.data().rc || '',
                if: doc.data().if || '',
                ...doc.data()
            } as Client)));
        }));

         // 7. Feedback Comments (that have due dates)
         // Note: feedbackUtils saves to 'comments' subcollection.
         const commentsQuery = query(collectionGroup(db, 'comments'), where('dueDate', '!=', null));
         unsubscribeFunctions.push(onSnapshot(commentsQuery, (snapshot) => {
              const items = snapshot.docs.map(doc => {
                  const pathSegments = doc.ref.path.split('/');
                  const projectId = pathSegments[1]; // projects/{projectId}/...
                  const data = doc.data();
                  return {
                      id: doc.id,
                      projectId,
                      targetId: data.targetId || '',
                      comment: data.comment || '',
                      reporterId: data.reporterId || '',
                      status: data.status || 'Active',
                      timestamp: data.timestamp || '',
                      pin_number: data.pin_number || 0,
                      targetType: data.targetType || 'website',
                      ...data
                  } as FeedbackComment;
              });
              setFeedbackComments(items);
         }));

        setLoading(false);

        return () => {
            unsubscribeFunctions.forEach(unsub => unsub());
        };
    }, [userId]);

    const events = useMemo(() => {
        const normalizedEvents: CalendarEvent[] = [];
        
        // Filter Projects: Show all projects for simplicity (or at least those user is involved in)
        // Relaxed filter: If user is member OR if memberIds is empty (public project)
        const userProjectIds = projects.filter(p => !p.memberIds || p.memberIds.length === 0 || p.memberIds.includes(userId)).map(p => p.id);
        const userBoardIds = boards.filter(b => userProjectIds.includes(b.projectId)).map(b => b.id);

        // Manual
        manualEvents.forEach(event => {
            normalizedEvents.push({
                ...event,
                startDate: ensureDateString(event.startDate),
                endDate: ensureDateString(event.endDate || event.startDate),
            });
        });

        // Tasks
        tasks.forEach(task => {
            if (!task.dueDate) return;
            // Relaxed visibility: If project is visible to user
            if (userBoardIds.includes(task.boardId)) {
                const start = ensureDateString(task.dueDate);
                const end = ensureDateString((task as any).endDate || task.dueDate || start);
                
                normalizedEvents.push({
                    id: `task-${task.id}`,
                    title: task.title,
                    startDate: start,
                    endDate: end,
                    type: 'task',
                    sourceId: task.id,
                    userId: 'system',
                    projectId: boards.find(b => b.id === task.boardId)?.projectId,
                    taskId: task.id
                });
            }
        });

        // Invoices
        invoices.forEach(inv => {
            const start = ensureDateString(inv.date);
            normalizedEvents.push({
                id: `inv-${inv.id}`,
                title: inv.invoiceNumber,
                startDate: start,
                endDate: start, // Invoices are usually single day
                type: 'invoice',
                sourceId: inv.id,
                userId: inv.userId,
            });
        });

        // Roadmap
        roadmapItems.forEach(item => {
             if (userProjectIds.includes(item.projectId)) {
                const start = ensureDateString(item.startDate);
                const end = ensureDateString(item.endDate || item.startDate);
                
                normalizedEvents.push({
                    id: `road-${item.id}`,
                    title: item.title,
                    startDate: start,
                    endDate: end,
                    type: 'roadmap_item',
                    sourceId: item.id,
                    userId: 'system',
                    projectId: item.projectId
                });
            }
        });

        // Feedback Comments
        feedbackComments.forEach(comment => {
            if (comment.projectId && userProjectIds.includes(comment.projectId)) {
                const titleText = comment.comment || 'Feedback';
                const start = ensureDateString(comment.dueDate);
                normalizedEvents.push({
                    id: `comment-${comment.id}`,
                    title: titleText,
                    startDate: start,
                    endDate: ensureDateString(comment.dueDate || start),
                    type: 'comment',
                    sourceId: comment.id,
                    userId: comment.reporterId,
                    projectId: comment.projectId,
                    feedbackItemId: comment.targetId
                });
            }
        });

        return normalizedEvents;
    }, [manualEvents, tasks, invoices, roadmapItems, feedbackComments, projects, boards, userId, clients]);

    return { events, loading, projects, boards, tasks, roadmapItems, invoices, brands: brandsList, clients, feedbackComments };
};
