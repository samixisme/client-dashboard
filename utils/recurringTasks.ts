import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Task, RecurringTaskSettings } from '../types';
import { stripUndefined } from './firestore';

export function computeNextDueDate(settings: RecurringTaskSettings): string {
    const base = new Date();
    const { frequency, interval } = settings;
    let next: Date;
    switch (frequency) {
        case 'daily':   next = addDays(base, interval); break;
        case 'weekly':  next = addWeeks(base, interval); break;
        case 'monthly': next = addMonths(base, interval); break;
        case 'yearly':  next = addYears(base, interval); break;
        default:        next = addDays(base, interval);
    }
    return next.toISOString();
}

export async function maybeCreateRecurringTask(completedTask: Task): Promise<void> {
    const { recurring } = completedTask;
    if (!recurring) return;
    if (recurring.repeatOnlyWhenCompleted === false) return;

    const nextDueDate = computeNextDueDate(recurring);

    const { id: _id, ...taskData } = completedTask;
    const newTask = stripUndefined({
        ...taskData,
        status: 'pending',
        dueDate: nextDueDate,
        stageId: recurring.repeatInStageId,
        createdAt: new Date().toISOString(),
        recurring: { ...recurring, nextDueDate },
    });

    await addDoc(collection(db, 'tasks'), {
        ...newTask,
        createdAt: serverTimestamp(),
    });
}
