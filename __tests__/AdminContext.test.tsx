import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AdminProvider, useAdmin } from '../contexts/AdminContext';
import { useUser } from '../contexts/UserContext';
import { useNavigate, useLocation } from 'react-router-dom';

const mockNavigateFn = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigateFn,
  useLocation: jest.fn(),
}));

jest.mock('../contexts/UserContext', () => ({
  useUser: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

const mockUseLocation = useLocation as jest.Mock;
const mockUseUser = useUser as jest.Mock;

const TestConsumer = () => {
  const { isAdminMode, toggleAdminMode, userRole, isAdmin, isLoadingAdminCheck } = useAdmin();
  return (
    <div>
      <span data-testid="isAdminMode">{isAdminMode ? 'true' : 'false'}</span>
      <span data-testid="userRole">{userRole}</span>
      <span data-testid="isAdmin">{isAdmin ? 'true' : 'false'}</span>
      <span data-testid="isLoadingAdminCheck">{isLoadingAdminCheck ? 'true' : 'false'}</span>
      <button data-testid="toggle" onClick={toggleAdminMode}>Toggle Admin Mode</button>
    </div>
  );
};

describe('AdminContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigateFn.mockClear();
    localStorage.clear();
    mockUseLocation.mockReturnValue({ pathname: '/' });
    mockUseUser.mockReturnValue({ user: { role: 'admin' }, loading: false });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows initial isAdminMode is false', () => {
    render(
      <AdminProvider>
        <TestConsumer />
      </AdminProvider>
    );
    expect(screen.getByTestId('isAdminMode').textContent).toBe('false');
  });

  it('flips the state when toggleAdminMode is called', () => {
    render(
      <AdminProvider>
        <TestConsumer />
      </AdminProvider>
    );
    
    expect(screen.getByTestId('isAdminMode').textContent).toBe('false');
    
    act(() => {
      screen.getByTestId('toggle').click();
    });
    
    expect(screen.getByTestId('isAdminMode').textContent).toBe('true');
  });

  it('persists admin mode to localStorage', () => {
    render(
      <AdminProvider>
        <TestConsumer />
      </AdminProvider>
    );
    
    act(() => {
      screen.getByTestId('toggle').click();
    });
    
    expect(localStorage.getItem('isAdminMode')).toBe('true');
    
    act(() => {
      screen.getByTestId('toggle').click();
    });
    
    expect(localStorage.getItem('isAdminMode')).toBe('false');
  });

  it('redirects non-admin users from admin routes', () => {
    mockUseUser.mockReturnValue({ user: { role: 'client' }, loading: false });
    mockUseLocation.mockReturnValue({ pathname: '/admin/dashboard' });
    
    render(
      <AdminProvider>
        <TestConsumer />
      </AdminProvider>
    );
    
    expect(mockNavigateFn).toHaveBeenCalledWith('/');
  });
  
  it('throws when useAdmin is called outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useAdmin must be used within an AdminProvider');

    spy.mockRestore();
  });
});
