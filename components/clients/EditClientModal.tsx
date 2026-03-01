
import React, { useState } from 'react';
import { addDoc, updateDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../utils/firebase';
import { Client } from '../../types';
import { stripUndefined } from '../../utils/firestore';
import { toast } from 'sonner';
import { z } from 'zod';

const clientSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    adresse: z.string().optional(),
    adresse2: z.string().optional(),
    ice: z.string().optional(),
    rc: z.string().optional(),
    if: z.string().optional(),
    brandId: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface EditClientModalProps {
    client?: Client;
    onClose: () => void;
}

const EditClientModal: React.FC<EditClientModalProps> = ({ client, onClose }) => {
    const [formData, setFormData] = useState<ClientFormData>({
        name: client?.name || '',
        adresse: client?.adresse || '',
        adresse2: client?.adresse2 || '',
        ice: client?.ice || '',
        rc: client?.rc || '',
        if: client?.if || '',
        brandId: client?.brandId || undefined,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setValidationError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const parsed = clientSchema.safeParse(formData);
        if (!parsed.success) {
            setValidationError(parsed.error.errors[0].message);
            return;
        }

        setIsSaving(true);
        try {
            const uid = auth.currentUser?.uid;
            if (!uid) throw new Error('Not authenticated');

            if (client?.id) {
                // Update existing client
                await updateDoc(doc(db, 'clients', client.id), stripUndefined({
                    ...parsed.data,
                    updatedAt: serverTimestamp(),
                }));
                toast.success('Client updated');
            } else {
                // Create new client
                await addDoc(collection(db, 'clients'), stripUndefined({
                    ...parsed.data,
                    userId: uid,
                    managedBy: [uid],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }));
                toast.success('Client added');
            }
            onClose();
        } catch (err) {
            toast.error('Failed to save client');
        } finally {
            setIsSaving(false);
        }
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
                        value={formData.adresse || ''}
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
                        value={formData.ice || ''}
                        onChange={handleChange}
                    />
                    <InputField
                        label="RC (Optional)"
                        name="rc"
                        value={formData.rc || ''}
                        onChange={handleChange}
                    />
                    <InputField
                        label="IF (Optional)"
                        name="if"
                        value={formData.if || ''}
                        onChange={handleChange}
                    />
                    {validationError && (
                        <p className="text-red-400 text-sm">{validationError}</p>
                    )}
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
                            disabled={isSaving}
                            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : client ? 'Save Changes' : 'Add Client'}
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
