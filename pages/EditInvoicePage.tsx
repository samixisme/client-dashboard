
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import InvoiceForm from '../components/payments/InvoiceForm';

const EditInvoicePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data } = useData();
    const { invoices } = data;

    // Find the invoice to edit
    const invoice = invoices.find(inv => inv.id === id);

    // If invoice not found, redirect to payments page
    if (!invoice) {
        navigate('/payments');
        return null;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Edit Invoice</h1>
                    <p className="mt-2 text-text-secondary">Update the invoice details below.</p>
                </div>
            </div>
            <InvoiceForm existingInvoice={invoice} />
        </div>
    );
};

export default EditInvoicePage;
