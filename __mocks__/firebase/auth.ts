// Manual mock for firebase/auth
export const getAuth = jest.fn(() => ({
  currentUser: { uid: 'test-uid', email: 'test@example.com' },
  onAuthStateChanged: jest.fn(),
}));
export const onAuthStateChanged = jest.fn((_auth: unknown, callback: (user: unknown) => void) => {
  callback({ uid: 'test-uid', email: 'test@example.com' });
  return jest.fn(); // unsubscribe
});
export const signInWithEmailLink = jest.fn(() =>
  Promise.resolve({ user: { uid: 'test-uid', email: 'test@example.com' } })
);
export const isSignInWithEmailLink = jest.fn(() => false);
export const sendSignInLinkToEmail = jest.fn(() => Promise.resolve());
export const signOut = jest.fn(() => Promise.resolve());
export const GoogleAuthProvider = jest.fn();
export const signInWithPopup = jest.fn(() =>
  Promise.resolve({ user: { uid: 'test-uid', email: 'test@example.com' } })
);
