import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionsPage from '../pages/SubscriptionsPage';
import { MemoryRouter } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

jest.mock('../contexts/DataContext', () => ({
  useData: jest.fn(),
}));

jest.mock('../contexts/AdminContext', () => ({
  useAdmin: () => ({ isEditMode: false, isAdmin: true }),
}));

jest.mock('../contexts/UserContext', () => ({
  useUser: () => ({ user: { uid: 'u1', role: 'admin' } }),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../components/payments/SubscriptionCard', () => ({
  SubscriptionCard: ({ subscription }: any) => <div data-testid="sub-card">{subscription.planName}</div>,
}));

jest.mock('../components/payments/AddSubscriptionModal', () => ({
  AddSubscriptionModal: () => <div data-testid="add-modal">Modal</div>,
}));

const mockUseData = useData as jest.Mock;

const mockSubscriptions = [
  { id: 's1', clientId: 'c1', paymenterClientId: 1, planName: 'Hosting Pro', price: 99, billingCycle: 'monthly', status: 'active', nextDueDate: '2025-02-01', createdAt: '2024-01-01', notes: '' }
];

describe('SubscriptionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ data: [] })
    })) as any;
  });

  it('renders loading state', async () => {
    mockUseData.mockReturnValue({
      data: { clients: [] },
      loading: true,
    });

    render(<MemoryRouter><SubscriptionsPage /></MemoryRouter>);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-pulse')).toBeTruthy();
    });
  });

  it('renders subscriptions list', async () => {
    mockUseData.mockReturnValue({
      data: { clients: [{ id: 'c1', name: 'Client A', company: 'Co' }] },
      loading: false,
    });

    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ success: true, data: mockSubscriptions })
    })) as any;

    render(<MemoryRouter><SubscriptionsPage /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getByTestId('sub-card')).toBeTruthy();
    });
  });

  it('shows empty state when no subscriptions', async () => {
    mockUseData.mockReturnValue({
      data: { clients: [] },
      loading: false,
    });

    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ success: true, data: [] })
    })) as any;

    render(<MemoryRouter><SubscriptionsPage /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getByText(/No subscriptions yet/i)).toBeTruthy();
    });
  });
});
