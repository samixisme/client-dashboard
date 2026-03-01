import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../pages/SettingsPage';
import { MemoryRouter } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { getDoc } from 'firebase/firestore';

jest.mock('../contexts/UserContext', () => ({
  useUser: jest.fn(),
}));

jest.mock('../utils/firebase', () => ({
  auth: { currentUser: { uid: 'u1', email: 'test@test.com' } },
  db: {},
  uploadFile: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, cb) => {
    cb({ uid: 'u1', email: 'test@test.com' });
    return jest.fn();
  }),
  updatePassword: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  reauthenticateWithCredential: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../components/ImageCropper', () => ({
  __esModule: true,
  default: () => <div data-testid="image-cropper">Cropper</div>,
}));

jest.mock('@novu/react', () => ({
  Inbox: () => <div data-testid="novu-inbox">Inbox</div>,
}));

const mockUseUser = useUser as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({ user: { uid: 'u1' }, refreshUser: jest.fn() });
    mockGetDoc.mockReturnValue(Promise.resolve({
      exists: () => true,
      data: () => ({
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: '',
        notificationPreferences: { emailNotifications: true, pushNotifications: false },
        theme: 'dark'
      })
    }));
  });

  it('renders loading state initially', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    // Checking for common loading indicators
    const loadingIndicators = document.querySelector('.animate-spin') || screen.queryByRole('progressbar') || screen.queryByText(/loading/i);
    expect(loadingIndicators).toBeTruthy();
  });

  it('renders settings form after loading', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    
    await waitFor(() => {
      const firstNameInput = screen.getByDisplayValue('John');
      expect(firstNameInput).toBeTruthy();
      
      const lastNameInput = screen.getByDisplayValue('Doe');
      expect(lastNameInput).toBeTruthy();
      
      const emailNotificationsToggle = screen.getByRole('checkbox', { name: /email/i }) || document.querySelector('input[type="checkbox"]');
      expect(emailNotificationsToggle).toBeTruthy();
    });
  });

  it('shows password change section when toggled', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const user = userEvent.setup();
    
    let changePasswordBtn;
    await waitFor(() => {
      changePasswordBtn = screen.getByText(/Change Password/i);
      expect(changePasswordBtn).toBeTruthy();
    });

    await user.click(changePasswordBtn as HTMLElement);

    await waitFor(() => {
      const currentPasswordInput = screen.queryByPlaceholderText(/Current Password/i) || screen.queryByLabelText(/Current Password/i) || document.querySelector('input[type="password"]');
      expect(currentPasswordInput).toBeTruthy();
    });
  });
});
