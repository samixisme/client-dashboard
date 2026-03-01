// Manual mock for utils/firebase — re-exports mock Firebase services
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const auth = {
  currentUser: {
    uid: 'test-uid',
    email: 'test@example.com',
    getIdToken: jest.fn(() => Promise.resolve('mock-token')),
  },
  onAuthStateChanged: jest.fn(),
};
export const db = getFirestore();
export const storage = getStorage();
export const appCheck = null;
export const uploadFile = jest.fn(() =>
  Promise.resolve('https://firebasestorage.example.com/mock-upload.png')
);
