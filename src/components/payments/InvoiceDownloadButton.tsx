import React, { useState } from 'react';
import { Invoice, Client, UserSettings } from '../../types';
import { InvoicePdfGenerator } from '../../utils/pdf/invoicePdfGenerator';
import { toast } from 'sonner';

interface InvoiceDownloadButtonProps {
    invoice: Invoice;
    client: Client;
    userSettings: UserSettings;
    variant?: 'primary' | 'secondary';
}

export const InvoiceDownloadButton: React.FC<InvoiceDownloadButtonProps> = ({
    invoice,
    client,
    userSettings,
    variant = 'primary'
}) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        try {
            setIsGenerating(true);
            await InvoicePdfGenerator.generateInvoicePdf(invoice, client, userSettings);
            toast.success('Invoice PDF downloaded');
        } catch (error) {
            console.error('Failed to generate invoice PDF:', error);
            toast.error('Failed to generate PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    const buttonClasses = variant === 'primary'
        ? 'px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
        : 'px-4 py-2 text-xs font-semibold text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-all duration-300 border border-green-500/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <button
            onClick={handleDownload}
            disabled={isGenerating}
            className={buttonClasses}
        >
            {isGenerating ? 'Generating...' : 'Download'}
        </button>
    );
};
