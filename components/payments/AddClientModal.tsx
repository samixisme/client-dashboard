
import React, { useState } from 'react';
import { Client } from '../../types';

interface AddClientModalProps {
    onClose: () => void;
    onAddClient: (client: Omit<Client, 'id'>) => void;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ onClose, onAddClient }) => {
    const [client, setClient] = useState<Omit<Client, 'id' | 'userId'>>({
        name: '',
        adresse: '',
        adresse2: '',
        ice: '',
        rc: '',
        if: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setClient({ ...client, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newClient: Omit<Client, 'id'> = {
            userId: 'user-1',
            ...client
        };
        onAddClient(newClient);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-glass w-full max-w-lg rounded-lg shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-6">Add New Client</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputField label="Name" name="name" value={client.name} onChange={handleChange} required />
                    <InputField label="Address Line 1 (Optional)" name="adresse" value={client.adresse} onChange={handleChange} />
                    <InputField label="Address Line 2 (Optional)" name="adresse2" value={client.adresse2 || ''} onChange={handleChange} />
                    <InputField label="ICE (Optional)" name="ice" value={client.ice} onChange={handleChange} />
                    <InputField label="RC (Optional)" name="rc" value={client.rc} onChange={handleChange} />
                    <InputField label="IF (Optional)" name="if" value={client.if} onChange={handleChange} />
                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover">Add Client</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InputField = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <input
            id={props.name}
            {...props}
            className="appearance-none block w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
    </div>
);


export default AddClientModal;