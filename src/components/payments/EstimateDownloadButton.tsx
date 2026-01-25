
import React, { useState } from 'react';
import { Estimate, Client, UserSettings } from '../../../types';
import { EstimatePdfGenerator } from '../../utils/pdf/estimatePdfGenerator';

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
        } catch (error) {
            console.error('Failed to generate estimate PDF:', error);
            alert('Failed to generate estimate PDF. Please try again.');
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
