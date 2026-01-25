import React, { useState } from 'react';
import { Invoice, Client, UserSettings } from '../../types';
import { InvoicePdfGenerator } from '../../utils/pdf/invoicePdfGenerator';

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
        } catch (error) {
            console.error('Failed to generate invoice PDF:', error);
            alert('Failed to generate invoice PDF. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const buttonClasses = variant === 'primary'
        ? 'px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover'
        : 'px-3 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors';

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
