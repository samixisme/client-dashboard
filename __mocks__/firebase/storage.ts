// Manual mock for firebase/storage
export const getStorage = jest.fn(() => 'mock-storage');
export const ref = jest.fn(() => 'mock-storage-ref');
export const uploadBytes = jest.fn(() =>
  Promise.resolve({ ref: 'mock-upload-ref', metadata: {} })
);
export const getDownloadURL = jest.fn(() =>
  Promise.resolve('https://firebasestorage.example.com/mock-file.png')
);
export const deleteObject = jest.fn(() => Promise.resolve());
