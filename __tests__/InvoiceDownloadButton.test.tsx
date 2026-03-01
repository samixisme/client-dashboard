import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoiceDownloadButton } from '../src/components/payments/InvoiceDownloadButton';
import { Invoice, Client, UserSettings } from '../types';

// Mock the PDF generator
jest.mock('../src/utils/pdf/invoicePdfGenerator', () => ({
  InvoicePdfGenerator: {
    generateInvoicePdf: jest.fn(() => Promise.resolve()),
  },
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { InvoicePdfGenerator } from '../src/utils/pdf/invoicePdfGenerator';
import { toast } from 'sonner';

const mockInvoice: Invoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-001',
  clientId: 'client-1',
  userId: 'user-1',
  status: 'Draft',
  date: '2025-01-01',
  dueDate: '2025-02-01',
  itemCategories: [],
  note: '',
  terms: '',
  totals: { subtotal: 100, totalNet: 120 },
};

const mockClient: Client = {
  id: 'client-1',
  userId: 'user-1',
  name: 'Test Client',
  adresse: '123 Test St',
  ice: '000000000000000',
  rc: '12345',
  if: '12345678',
  brandId: 'brand-1',
};

const mockUserSettings: UserSettings = {
  userId: 'user-1',
  ae: '', cnie: '', ice: '', if: '', tp: '', adresse_ae: '',
  bankDetails: { codeBanque: '', codeVille: '', nDeCompte: '', cleRib: '', codeSwift: '' },
  footerDetails: { adresseMail: '', telephone: '', site: '' },
  legalNote: '', signatureBoxClient: '', signatureBoxAutoEntrepreneur: '',
};

describe('InvoiceDownloadButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the download button', () => {
    render(
      <InvoiceDownloadButton
        invoice={mockInvoice}
        client={mockClient}
        userSettings={mockUserSettings}
        variant="primary"
      />
    );

    expect(screen.getByTitle('Download')).toBeTruthy();
    expect(screen.getByText('Download')).toBeTruthy();
  });

  it('renders secondary variant with SVG icon instead of text', () => {
    render(
      <InvoiceDownloadButton
        invoice={mockInvoice}
        client={mockClient}
        userSettings={mockUserSettings}
        variant="secondary"
      />
    );

    const btn = screen.getByTitle('Download');
    expect(btn.querySelector('svg')).toBeTruthy();
  });

  it('calls PDF generator on click and shows success toast', async () => {
    const user = userEvent.setup();

    render(
      <InvoiceDownloadButton
        invoice={mockInvoice}
        client={mockClient}
        userSettings={mockUserSettings}
      />
    );

    await user.click(screen.getByTitle('Download'));

    await waitFor(() => {
      expect(InvoicePdfGenerator.generateInvoicePdf).toHaveBeenCalledWith(
        mockInvoice,
        mockClient,
        mockUserSettings
      );
      expect(toast.success).toHaveBeenCalledWith('Invoice PDF downloaded');
    });
  });

  it('shows error toast when PDF generation fails', async () => {
    (InvoicePdfGenerator.generateInvoicePdf as jest.Mock).mockRejectedValueOnce(new Error('PDF error'));
    const user = userEvent.setup();

    render(
      <InvoiceDownloadButton
        invoice={mockInvoice}
        client={mockClient}
        userSettings={mockUserSettings}
      />
    );

    await user.click(screen.getByTitle('Download'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to generate PDF');
    });
  });

  it('disables button while generating', async () => {
    // Make PDF generation hang
    let resolveGenerate: () => void;
    (InvoicePdfGenerator.generateInvoicePdf as jest.Mock).mockImplementation(
      () => new Promise<void>((resolve) => { resolveGenerate = resolve; })
    );

    const user = userEvent.setup();

    render(
      <InvoiceDownloadButton
        invoice={mockInvoice}
        client={mockClient}
        userSettings={mockUserSettings}
        variant="primary"
      />
    );

    await user.click(screen.getByText('Download'));

    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeTruthy();
      expect(screen.getByTitle('Generating...')).toBeDisabled();
    });

    // Resolve and verify it re-enables
    await act(async () => { resolveGenerate!(); });

    await waitFor(() => {
      expect(screen.getByText('Download')).toBeTruthy();
    });
  });
});
