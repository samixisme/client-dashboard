
import React from 'react';
import EstimateForm from '../components/payments/EstimateForm';

const CreateEstimatePage = () => {
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Create New Estimate</h1>
                    <p className="mt-2 text-text-secondary">Fill out the details below to create a new estimate.</p>
                </div>
            </div>
            <EstimateForm />
        </div>
    );
};

export default CreateEstimatePage;
