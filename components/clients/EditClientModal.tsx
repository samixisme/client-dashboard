
import React, { useState } from 'react';
import { Client } from '../../types';

interface EditClientModalProps {
    client?: Client;
    onClose: () => void;
    onSave: (client: Client) => void;
}

const EditClientModal: React.FC<EditClientModalProps> = ({ client, onClose, onSave }) => {
    const [formData, setFormData] = useState<Omit<Client, 'id' | 'userId'>>({
        name: client?.name || '',
        adresse: client?.adresse || '',
        adresse2: client?.adresse2 || '',
        ice: client?.ice || '',
        rc: client?.rc || '',
        if: client?.if || '',
        brandId: client?.brandId || undefined,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required field
        if (!formData.name.trim()) {
            alert('Client name is required.');
            return;
        }

        const savedClient: Client = {
            id: client?.id || `client-${Date.now()}`,
            userId: client?.userId || 'user-1', // Hardcoded for now
            ...formData
        };

        onSave(savedClient);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-glass w-full max-w-lg rounded-lg shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-6">
                    {client ? 'Edit Client' : 'Add New Client'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputField
                        label="Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                    <InputField
                        label="Address Line 1 (Optional)"
                        name="adresse"
                        value={formData.adresse}
                        onChange={handleChange}
                    />
                    <InputField
                        label="Address Line 2 (Optional)"
                        name="adresse2"
                        value={formData.adresse2 || ''}
                        onChange={handleChange}
                    />
                    <InputField
                        label="ICE (Optional)"
                        name="ice"
                        value={formData.ice}
                        onChange={handleChange}
                    />
                    <InputField
                        label="RC (Optional)"
                        name="rc"
                        value={formData.rc}
                        onChange={handleChange}
                    />
                    <InputField
                        label="IF (Optional)"
                        name="if"
                        value={formData.if}
                        onChange={handleChange}
                    />
                    <div className="flex justify-end gap-4 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover"
                        >
                            {client ? 'Save Changes' : 'Add Client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InputField = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">
            {label}
        </label>
        <input
            id={props.name}
            {...props}
            className="appearance-none block w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
    </div>
);

export default EditClientModal;
