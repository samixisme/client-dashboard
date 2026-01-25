
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import EstimateForm from '../components/payments/EstimateForm';

const EditEstimatePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data } = useData();
    const { estimates } = data;

    // Find the estimate to edit
    const estimate = estimates.find(est => est.id === id);

    // If estimate not found, redirect to payments page
    if (!estimate) {
        navigate('/payments?tab=estimates');
        return null;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Edit Estimate</h1>
                    <p className="mt-2 text-text-secondary">Update the estimate details below.</p>
                </div>
            </div>
            <EstimateForm existingEstimate={estimate} />
        </div>
    );
};

export default EditEstimatePage;
