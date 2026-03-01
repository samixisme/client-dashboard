import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProposalsPage from '../pages/ProposalsPage';
import { useData } from '../contexts/DataContext';
import { MemoryRouter } from 'react-router-dom';
import { onSnapshot } from 'firebase/firestore';

jest.mock('../contexts/DataContext', () => ({
  useData: jest.fn(),
}));

jest.mock('../contexts/SearchContext', () => ({
  useSearch: () => ({ searchQuery: '' }),
}));

jest.mock('../utils/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(),
}));

const mockUseData = useData as jest.Mock;

const mockProposals = [
  { id: 'p1', clientId: 'c1', title: 'Test Proposal', status: 'Sent', totalAmount: 1000, createdAt: new Date().toISOString() },
];

describe('ProposalsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (onSnapshot as jest.Mock).mockImplementation((q, cb) => {
      cb({ docs: mockProposals.map(p => ({ id: p.id, data: () => p })) });
      return () => {};
    });
  });

  it('renders proposals list and create button', async () => {
    mockUseData.mockReturnValue({ data: { user: {} }, loading: false });

    render(<MemoryRouter><ProposalsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Test Proposal')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /New Proposal|Create/i })).toBeTruthy();
  });

  it('shows proposal status badges', async () => {
    mockUseData.mockReturnValue({ data: { user: {} }, loading: false });

    render(<MemoryRouter><ProposalsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Sent')).toBeTruthy();
    });
  });

  it('opens modal on create button click', async () => {
    mockUseData.mockReturnValue({ data: { user: {} }, loading: false });
    const user = userEvent.setup();
    render(<MemoryRouter><ProposalsPage /></MemoryRouter>);
    
    const createBtn = screen.getByRole('button', { name: /New Proposal|Create/i });
    await user.click(createBtn);
    
    expect(screen.getAllByText(/Title/)[0]).toBeTruthy();
  });
});

