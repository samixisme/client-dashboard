import { updateSourceItemDate } from '../utils/calendarSync';
import { doc, updateDoc } from 'firebase/firestore';

// Mock Firebase
jest.mock('../utils/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

describe('calendarSync - Bug Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateSourceItemDate', () => {
    it('should update roadmap item with correct projectId path', async () => {
      const mockDoc = { path: 'projects/project-123/roadmap_items/roadmap-456' };
      (doc as jest.Mock).mockReturnValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const sourceId = 'roadmap-456';
      const projectId = 'project-123';
      const newDates = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      // This should accept projectId as a parameter
      await updateSourceItemDate(sourceId, 'roadmap_item', newDates, projectId);

      // Verify doc() was called with correct path including projectId
      expect(doc).toHaveBeenCalledWith(
        {},
        'projects',
        'project-123', // Should use actual projectId, not 'PROJECT_ID_NEEDED'
        'roadmap_items',
        'roadmap-456'
      );

      // Verify updateDoc was called with correct dates
      expect(updateDoc).toHaveBeenCalledWith(mockDoc, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('should update task due date correctly', async () => {
      const mockDoc = { path: 'tasks/task-123' };
      (doc as jest.Mock).mockReturnValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await updateSourceItemDate('task-123', 'task', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(doc).toHaveBeenCalledWith({}, 'tasks', 'task-123');
      expect(updateDoc).toHaveBeenCalledWith(mockDoc, { dueDate: '2024-01-31' });
    });

    it('should update invoice date correctly', async () => {
      const mockDoc = { path: 'invoices/inv-123' };
      (doc as jest.Mock).mockReturnValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await updateSourceItemDate('inv-123', 'invoice', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(doc).toHaveBeenCalledWith({}, 'invoices', 'inv-123');
      expect(updateDoc).toHaveBeenCalledWith(mockDoc, { date: '2024-01-01' });
    });
  });
});
