import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BillingPage from '../pages/BillingPage';
import { useData } from '../contexts/DataContext';
import { useUser } from '../contexts/UserContext';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../contexts/DataContext', () => ({ useData: jest.fn() }));
jest.mock('../contexts/UserContext',  () => ({ useUser: jest.fn() }));
jest.mock('../contexts/SearchContext', () => ({ useSearch: () => ({ searchQuery: '' }) }));
jest.mock('../contexts/AdminContext',  () => ({ useAdmin: () => ({ isAdminMode: false }) }));
jest.mock('../components/admin/AdminPanel', () => () => <div data-testid="admin-panel" />);
jest.mock('../src/components/payments/DocumentDownloadButton', () => ({
  DocumentDownloadButton: ({ type, document }: any) =>
    type === 'invoice'
      ? <button data-testid="download-invoice">Download {document?.invoiceNumber}</button>
      : <button data-testid="download-estimate">Download {document?.estimateNumber}</button>,
}));
jest.mock('../components/payments/SubscriptionCard', () => ({
  SubscriptionCard: ({ subscription }: any) => <div data-testid="subscription-card">{subscription.planName}</div>,
}));
jest.mock('../components/payments/AddSubscriptionModal', () => ({
  AddSubscriptionModal: () => <div data-testid="add-subscription-modal" />,
}));
jest.mock('../utils/invoiceService', () => ({
  updateInvoiceStatus: jest.fn(),
  updateEstimateStatus: jest.fn(),
  convertEstimateToInvoice: jest.fn(),
  deleteInvoice: jest.fn(),
  deleteEstimate: jest.fn(),
}));
jest.mock('../src/hooks/useNovuTrigger', () => ({
  useNovuTrigger: () => ({ trigger: jest.fn() }),
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({ ok: false, headers: { get: () => null }, json: async () => ({}) } as any)
);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockInvoices = [
  { id: 'inv1', invoiceNumber: 'INV-001', clientId: 'c1', date: '2024-01-10', dueDate: '2024-01-25', totals: { totalNet: 1200 }, status: 'Sent', items: [] },
];
const mockEstimates = [
  { id: 'est1', estimateNumber: 'EST-001', clientId: 'c1', date: '2024-01-05', validUntil: '2024-01-20', totals: { totalNet: 900 }, status: 'Sent', items: [] },
];
const mockClients = [{ id: 'c1', name: 'Acme Corp', company: 'Acme' }];

const mockData = {
  invoices: mockInvoices,
  estimates: mockEstimates,
  clients: mockClients,
  brands: [],
  userSettings: [],
};

const mockUseData = useData as jest.Mock;
const mockUseUser = useUser as jest.Mock;

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderPage(initialEntry = '/billing') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <BillingPage />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BillingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({ user: { uid: 'u1', role: 'admin' }, loading: false });
    mockUseData.mockReturnValue({ data: mockData, loading: false });
  });

  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /billing/i })).toBeTruthy();
  });

  it('shows all 4 tab labels', () => {
    renderPage();
    expect(screen.getByText('Invoices')).toBeTruthy();
    expect(screen.getByText('Estimates')).toBeTruthy();
    expect(screen.getByText('Subscriptions')).toBeTruthy();
    expect(screen.getByText('Billing History')).toBeTruthy();
  });

  it('shows stats bar with 4 stat cards', () => {
    renderPage();
    expect(screen.getByText('Total Invoiced')).toBeTruthy();
    expect(screen.getByText('Active Subscriptions')).toBeTruthy();
    expect(screen.getByText('Est. MRR')).toBeTruthy();
    expect(screen.getByText('Overdue')).toBeTruthy();
  });

  it('defaults to the invoices tab and renders invoice rows', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('INV-001')).toBeTruthy());
  });

  it('shows empty state on invoices tab when no invoices', async () => {
    mockUseData.mockReturnValue({ data: { ...mockData, invoices: [] }, loading: false });
    renderPage();
    await waitFor(() => expect(screen.getByText(/Create your first invoice/i)).toBeTruthy());
  });

  it('switches to estimates tab and renders estimate rows', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByText('Estimates'));
    await waitFor(() => expect(screen.getByText('EST-001')).toBeTruthy());
  });

  it('shows empty state on estimates tab when no estimates', async () => {
    mockUseData.mockReturnValue({ data: { ...mockData, estimates: [] }, loading: false });
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByText('Estimates'));
    await waitFor(() => expect(screen.getByText(/Create your first estimate/i)).toBeTruthy());
  });

  it('switches to subscriptions tab and shows Paymenter banner when API unreachable', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByText('Subscriptions'));
    // fetch mock returns an unsuccessful response — banner should appear
    await waitFor(() =>
      expect(
        screen.queryByText(/Paymenter not configured/i) ||
        screen.queryByText(/Cannot reach Paymenter/i)
      ).not.toBeNull()
    );
  });

  it('switches to billing history tab', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByText('Billing History'));
    await waitFor(() => expect(screen.getByRole('table', { name: /billing history/i })).toBeTruthy());
  });

  it('renders download button for invoice row', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('download-invoice')).toBeTruthy());
  });
});
