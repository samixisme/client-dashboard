import { z } from 'zod';

export const taskCreationSchema = z.object({
    title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
    stageId: z.string().min(1, 'Stage is required'),
    boardId: z.string().min(1, 'Board is required'),
    priority: z.enum(['Low', 'Medium', 'High']).optional(),
    dueDate: z.string().optional(),
});

export type TaskCreationInput = z.infer<typeof taskCreationSchema>;
