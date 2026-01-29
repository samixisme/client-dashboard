
import React, { useState } from 'react';
import { Estimate, Client, UserSettings } from '../../../types';
import { EstimatePdfGenerator } from '../../utils/pdf/estimatePdfGenerator';
import { toast } from 'sonner';

interface EstimateDownloadButtonProps {
    estimate: Estimate;
    client: Client;
    userSettings: UserSettings;
    variant?: 'primary' | 'secondary';
}

export const EstimateDownloadButton: React.FC<EstimateDownloadButtonProps> = ({
    estimate,
    client,
    userSettings,
    variant = 'primary'
}) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        try {
            setIsGenerating(true);
            await EstimatePdfGenerator.generateEstimatePdf(estimate, client, userSettings);
            toast.success('Estimate PDF downloaded');
        } catch (error) {
            console.error('Failed to generate estimate PDF:', error);
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
