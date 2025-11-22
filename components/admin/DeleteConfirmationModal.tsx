import React from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  message?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-glass border border-border-color rounded-xl shadow-xl w-full max-w-sm">
        <div className="p-8 space-y-6 text-center">
          <h2 className="text-xl font-bold text-text-primary">Confirm Deletion</h2>
          <p className="text-sm text-text-secondary">
            {message || `Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
          </p>
          <div className="flex justify-center items-center gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-text-secondary bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
