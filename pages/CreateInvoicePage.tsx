
import React from 'react';
import InvoiceForm from '../components/payments/InvoiceForm';

const CreateInvoicePage = () => {
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Create New Invoice</h1>
                    <p className="mt-2 text-text-secondary">Fill out the details below to create a new invoice.</p>
                </div>
            </div>
            <InvoiceForm />
        </div>
    );
};

export default CreateInvoicePage;
