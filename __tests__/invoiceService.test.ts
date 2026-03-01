import { updateInvoiceStatus, updateEstimateStatus, createInvoice, deleteInvoice } from '../utils/invoiceService';
import { updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUpdateDoc = updateDoc as jest.Mock;
const mockAddDoc = addDoc as jest.Mock;
const mockDeleteDoc = deleteDoc as jest.Mock;

describe('invoiceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateInvoiceStatus', () => {
    it('updates invoice status in Firestore', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateInvoiceStatus('inv-1', 'Paid');

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const [, updateData] = mockUpdateDoc.mock.calls[0];
      expect(updateData.status).toBe('Paid');
    });

    it('rejects invalid status values', async () => {
      await expect(updateInvoiceStatus('inv-1', 'InvalidStatus' as any)).rejects.toThrow();
    });

    it('shows error toast when Firestore update fails', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(updateInvoiceStatus('inv-1', 'Paid')).rejects.toThrow();
      expect(toast.error).toHaveBeenCalledWith('Failed to update invoice status');
    });
  });

  describe('updateEstimateStatus', () => {
    it('updates estimate status in Firestore', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateEstimateStatus('est-1', 'Sent');

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const [, updateData] = mockUpdateDoc.mock.calls[0];
      expect(updateData.status).toBe('Sent');
    });

    it('rejects invalid estimate status', async () => {
      await expect(updateEstimateStatus('est-1', 'BadStatus' as any)).rejects.toThrow();
    });
  });

  describe('createInvoice', () => {
    it('creates invoice and returns document ID', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-inv-id' });

      const id = await createInvoice({ clientId: 'c1', invoiceNumber: 'INV-001', status: 'Draft' });

      expect(id).toBe('new-inv-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteInvoice', () => {
    it('deletes invoice from Firestore', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await deleteInvoice('inv-1');

      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });
  });
});
