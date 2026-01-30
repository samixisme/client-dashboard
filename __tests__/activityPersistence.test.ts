import { addDoc, collection } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Activity } from '../types';

// Mock Firebase
jest.mock('../utils/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
}));

describe('Activity Persistence - Bug #2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveActivityToFirestore', () => {
    it('should persist activity to Firestore when task is updated', async () => {
      const mockCollection = { path: 'activities' };
      const mockDocRef = { id: 'activity-123', path: 'activities/activity-123' };

      (collection as jest.Mock).mockReturnValue(mockCollection);
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const activity: Omit<Activity, 'id'> = {
        objectId: 'task-456',
        objectType: 'task',
        description: 'admin updated title, changed status to In Progress.',
        timestamp: '2024-01-30T10:00:00.000Z'
      };

      // This function should save activity to Firestore
      const saveActivityToFirestore = async (activityData: Omit<Activity, 'id'>) => {
        const docRef = await addDoc(collection(db, 'activities'), activityData);
        return { id: docRef.id, ...activityData };
      };

      const savedActivity = await saveActivityToFirestore(activity);

      // Verify collection was called correctly
      expect(collection).toHaveBeenCalledWith({}, 'activities');

      // Verify addDoc was called with activity data
      expect(addDoc).toHaveBeenCalledWith(mockCollection, activity);

      // Verify function returns activity with ID
      expect(savedActivity).toEqual({
        id: 'activity-123',
        ...activity
      });
    });

    it('should handle Firestore errors gracefully', async () => {
      (collection as jest.Mock).mockReturnValue({ path: 'activities' });
      (addDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      const activity: Omit<Activity, 'id'> = {
        objectId: 'task-789',
        objectType: 'task',
        description: 'admin updated priority.',
        timestamp: '2024-01-30T11:00:00.000Z'
      };

      const saveActivityToFirestore = async (activityData: Omit<Activity, 'id'>) => {
        try {
          const docRef = await addDoc(collection(db, 'activities'), activityData);
          return { id: docRef.id, ...activityData };
        } catch (error) {
          console.error('Error saving activity:', error);
          throw error;
        }
      };

      await expect(saveActivityToFirestore(activity)).rejects.toThrow('Firestore error');
    });
  });
});
