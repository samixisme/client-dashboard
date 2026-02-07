
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
        : 'p-2 text-text-secondary hover:text-primary bg-glass/40 hover:bg-glass/60 rounded-lg transition-all duration-300 border border-border-color cursor-pointer hover:scale-110 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <button
            onClick={handleDownload}
            disabled={isGenerating}
            className={buttonClasses}
            title={isGenerating ? 'Generating...' : 'Download'}
        >
            {variant === 'secondary' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            ) : (
                isGenerating ? 'Generating...' : 'Download'
            )}
        </button>
    );
};
