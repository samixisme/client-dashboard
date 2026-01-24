import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../utils/firebase';
import { collection, query, where, onSnapshot, collectionGroup, Timestamp, orderBy } from 'firebase/firestore';
import { CalendarEvent, Task, Invoice, RoadmapItem, Project, Board } from '../types';

export const useCalendarEvents = (userId: string) => {
    const [manualEvents, setManualEvents] = useState<CalendarEvent[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [boards, setBoards] = useState<Board[]>([]);
    const [feedbackComments, setFeedbackComments] = useState<any[]>([]); // Use 'any' or import FeedbackComment type
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeFunctions: (() => void)[] = [];

        // 1. Projects
        const authProjectsQuery = query(collection(db, 'projects')); 
        unsubscribeFunctions.push(onSnapshot(authProjectsQuery, (snapshot) => {
            const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            setProjects(fetchedProjects);
        }));

        // 2. Boards
        const boardsQuery = query(collection(db, 'boards'));
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

        // 4. Tasks
        const tasksQuery = query(collection(db, 'tasks'), where('dueDate', '!=', null));
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

         // 7. Feedback Comments (that have due dates)
         // Note: feedbackUtils saves to 'comments' subcollection.
         const commentsQuery = query(collectionGroup(db, 'comments'), where('dueDate', '!=', null));
         unsubscribeFunctions.push(onSnapshot(commentsQuery, (snapshot) => {
              const items = snapshot.docs.map(doc => {
                  const pathSegments = doc.ref.path.split('/');
                  const projectId = pathSegments[1]; // projects/{projectId}/...
                  return { id: doc.id, projectId, ...doc.data() };
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
        normalizedEvents.push(...manualEvents);

        // Tasks
        tasks.forEach(task => {
            if (!task.dueDate) return;
            // Relaxed visibility: If project is visible to user
            if (userBoardIds.includes(task.boardId)) {
                normalizedEvents.push({
                    id: `task-${task.id}`,
                    title: `Task: ${task.title}`,
                    startDate: task.dueDate,
                    endDate: task.dueDate,
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
            normalizedEvents.push({
                id: `inv-${inv.id}`,
                title: `Invoice #${inv.invoiceNumber}`,
                startDate: inv.date,
                endDate: inv.date,
                type: 'invoice',
                sourceId: inv.id,
                userId: inv.userId,
            });
        });

        // Roadmap
        roadmapItems.forEach(item => {
             // Relaxed filter: Show if project is visible
             if (userProjectIds.includes(item.projectId)) {
                normalizedEvents.push({
                    id: `road-${item.id}`,
                    title: `Roadmap: ${item.title}`,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    type: 'roadmap_item',
                    sourceId: item.id,
                    userId: 'system',
                    projectId: item.projectId
                });
            }
        });

        // Feedback Comments
        feedbackComments.forEach(comment => {
            // Visibility: Check project visibility
            if (comment.projectId && userProjectIds.includes(comment.projectId)) {
                const titleText = comment.comment || comment.commentText || 'Feedback';
                const authorId = comment.reporterId || comment.authorId;
                
                normalizedEvents.push({
                    id: `comment-${comment.id}`,
                    title: titleText, // Cleaned up: No "Comment #" prefix, no manual truncation
                    startDate: comment.dueDate,
                    endDate: comment.dueDate,
                    type: 'comment', // Correct type
                    sourceId: comment.id,
                    userId: authorId,
                    projectId: comment.projectId,
                    feedbackItemId: comment.feedbackItemId 
                });
            }
        });

        return normalizedEvents;
    }, [manualEvents, tasks, invoices, roadmapItems, feedbackComments, projects, boards, userId]);

    return { events, loading };
};
