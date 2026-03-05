import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentsPage from '../pages/PaymentsPage';
import { useData } from '../contexts/DataContext';
import { useUser } from '../contexts/UserContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../contexts/DataContext', () => ({
  useData: jest.fn(),
}));

jest.mock('../contexts/UserContext', () => ({
  useUser: jest.fn(),
}));

jest.mock('../contexts/SearchContext', () => ({
  useSearch: () => ({ searchQuery: '' }),
}));

jest.mock('../contexts/AdminContext', () => ({
  useAdmin: () => ({ isEditMode: true }),
}));

jest.mock('../components/admin/AdminPanel', () => () => <div data-testid='admin-panel'>Admin Panel</div>);

jest.mock('../src/components/payments/DocumentDownloadButton', () => ({
  DocumentDownloadButton: ({ type, document }: any) => {
    if (type === 'invoice') {
      return <button data-testid="download-invoice">Download {document?.invoiceNumber}</button>;
    } else {
      return <button data-testid="download-estimate">Download {document?.estimateNumber}</button>;
    }
  },
}));

jest.mock('../utils/invoiceService', () => ({
  updateInvoiceStatus: jest.fn(),
  updateEstimateStatus: jest.fn(),
  convertEstimateToInvoice: jest.fn(),
  deleteInvoice: jest.fn(),
  deleteEstimate: jest.fn(),
}));

jest.mock('../src/hooks/useNovuTrigger', () => ({
  useNovuTrigger: () => ({ triggerNotification: jest.fn() }),
}));

const mockUseData = useData as jest.Mock;
const mockUseUser = useUser as jest.Mock;

const mockInvoices = [
  { id: 'inv1', invoiceNumber: 'INV-001', clientId: 'c1', date: '2023-01-01', dueDate: '2023-01-15', totals: { totalNet: 1000 }, status: 'Sent', items: [] },
];

const mockEstimates = [
  { id: 'est1', estimateNumber: 'EST-001', clientId: 'c1', date: '2023-01-01', validUntil: '2023-01-15', totals: { totalNet: 500 }, status: 'Sent', items: [] },
];

const mockClients = [
  { id: 'c1', name: 'Test Client', company: 'Test Co' }
];

describe('PaymentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({ user: { uid: 'admin1', role: 'admin' }, loading: false });
  });

  it('shows empty state when no data', async () => {
    mockUseData.mockReturnValue({
      data: { invoices: [], estimates: [], clients: mockClients, userSettings: [] },
      loading: false,
    });

    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Create Invoice/i)).toBeTruthy());
  });

  it('renders invoice list', async () => {
    mockUseData.mockReturnValue({
      data: { invoices: mockInvoices, estimates: mockEstimates, clients: mockClients, userSettings: [] },
      loading: false,
    });

    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('INV-001')).toBeTruthy());
  });

  it('renders estimate list when tab is switched', async () => {
    mockUseData.mockReturnValue({
      data: { invoices: mockInvoices, estimates: mockEstimates, clients: mockClients, userSettings: [] },
      loading: false,
    });

    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    const user = userEvent.setup();
    
    const estimatesTab = screen.getByText('Estimates');
    await user.click(estimatesTab);
    
    await waitFor(() => expect(screen.getByText('EST-001')).toBeTruthy());
  });

  it('download button triggers handler', async () => {
    mockUseData.mockReturnValue({
      data: { invoices: mockInvoices, estimates: [], clients: mockClients, userSettings: [] },
      loading: false,
    });

    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    await waitFor(() => {
      const downloadBtn = screen.getByTestId('download-invoice');
      expect(downloadBtn).toBeTruthy();
      expect(downloadBtn.textContent).toContain('INV-001');
    });
  });
});
