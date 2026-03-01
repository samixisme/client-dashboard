// Manual mock for firebase/firestore
const mockUnsubscribe = jest.fn();

export const collection = jest.fn(() => 'mock-collection-ref');
export const doc = jest.fn(() => 'mock-doc-ref');
export const addDoc = jest.fn(() => Promise.resolve({ id: 'mock-doc-id' }));
export const getDoc = jest.fn(() =>
  Promise.resolve({
    exists: () => true,
    id: 'mock-doc-id',
    data: () => ({}),
  })
);
export const getDocs = jest.fn(() =>
  Promise.resolve({
    docs: [],
    forEach: jest.fn(),
    empty: true,
    size: 0,
  })
);
export const setDoc = jest.fn(() => Promise.resolve());
export const updateDoc = jest.fn(() => Promise.resolve());
export const deleteDoc = jest.fn(() => Promise.resolve());
export const query = jest.fn((...args: unknown[]) => args[0]);
export const where = jest.fn(() => 'mock-where');
export const orderBy = jest.fn(() => 'mock-orderBy');
export const limit = jest.fn(() => 'mock-limit');
export const startAfter = jest.fn(() => 'mock-startAfter');
export const onSnapshot = jest.fn((_ref: unknown, callback: (snap: unknown) => void) => {
  callback({ docs: [], forEach: jest.fn(), empty: true, size: 0 });
  return mockUnsubscribe;
});
export const serverTimestamp = jest.fn(() => ({ _type: 'serverTimestamp' }));
export const collectionGroup = jest.fn(() => 'mock-collection-group');
export const increment = jest.fn((n: number) => ({ _type: 'increment', value: n }));
export const writeBatch = jest.fn(() => ({
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn(() => Promise.resolve()),
}));
export const Timestamp = {
  now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date() })),
  fromDate: jest.fn((d: Date) => ({ seconds: d.getTime() / 1000, nanoseconds: 0, toDate: () => d })),
};
export const getFirestore = jest.fn(() => 'mock-db');
