jest.mock('react-phone-number-input/style.css', () => ({}), { virtual: true });
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../pages/LoginPage';
import { signInWithEmailAndPassword, sendSignInLinkToEmail } from 'firebase/auth';

jest.mock('../utils/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

jest.mock('react-phone-number-input', () => ({
  __esModule: true,
  default: (props: any) => <input data-testid="phone-input" {...props} />,
  isPossiblePhoneNumber: () => true,
}));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  RecaptchaVerifier: jest.fn(),
  signInWithPhoneNumber: jest.fn(),
  sendSignInLinkToEmail: jest.fn(),
  setPersistence: jest.fn(),
  browserLocalPersistence: 'local',
  browserSessionPersistence: 'session',
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => true, data: () => ({ status: 'active' }) }),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('gsap', () => ({
  gsap: {
    fromTo: jest.fn(),
    to: jest.fn(),
  }
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form', () => {
    render(<LoginPage onLogin={() => {}} />);
    expect(screen.getByPlaceholderText(/Email address/i)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Sign in$/i })[0]).toBeTruthy();
  });

  it('email input accepts text', async () => {
    const user = userEvent.setup();
    render(<LoginPage onLogin={() => {}} />);
    
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    await user.type(emailInput, 'test@example.com');
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('submit button triggers auth', async () => {
    const user = userEvent.setup();
    const mockOnLogin = jest.fn();
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: { uid: '123' } });
    
    render(<LoginPage onLogin={mockOnLogin} />);
    
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    const submitBtn = screen.getAllByRole('button', { name: /^Sign in$/i })[0];
    await user.click(submitBtn);
    
    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalled();
    });
  });

  it('calls onLogin on successful login', async () => {
    const user = userEvent.setup();
    const mockOnLogin = jest.fn();
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: { uid: '123' } });
    
    render(<LoginPage onLogin={mockOnLogin} />);
    
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    const submitBtn = screen.getAllByRole('button', { name: /^Sign in$/i })[0];
    await user.click(submitBtn);
    
    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });
});

