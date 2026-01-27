
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clients as initialClients } from '../../data/paymentsData';
import { Estimate, Client, ItemCategory, LineItem, User } from '../../types';
import AddClientModal from './AddClientModal';
import { createCalendarEvent } from '../../utils/calendarSync';
import { useData } from '../../contexts/DataContext';
import { toast } from 'sonner';

interface EstimateFormProps {
    existingEstimate?: Estimate;
}

const EstimateForm: React.FC<EstimateFormProps> = ({ existingEstimate }) => {
    const navigate = useNavigate();
    const { data, updateData } = useData();
    const [clients, setClients] = useState<Client[]>(data.clients || initialClients);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [estimate, setEstimate] = useState<Omit<Estimate, 'id' | 'estimateNumber'> & { id?: string; estimateNumber?: string }>(
        existingEstimate || {
            userId: 'user-1',
            clientId: '',
            date: new Date().toISOString().split('T')[0],
            dueDate: undefined,
            assignedUserIds: [],
            status: 'Draft',
            itemCategories: [],
            note: '',
            terms: 'Paiement à 30 jours.',
            totals: { subtotal: 0, totalNet: 0 },
        }
    );

    useEffect(() => {
        const subtotal = estimate.itemCategories.reduce((catTotal, category) => {
            const itemsTotal = category.items.reduce((itemTotal, item) => {
                return itemTotal + (item.quantity * item.unitPrice);
            }, 0);
            return catTotal + itemsTotal;
        }, 0);

        setEstimate(est => ({ ...est, totals: { subtotal, totalNet: subtotal } }));
    }, [estimate.itemCategories]);

    const handleClientChange = (clientId: string) => {
        setEstimate({ ...estimate, clientId });
    };

    const handleAddClient = (client: Client) => {
        const newClients = [...clients, client];
        setClients(newClients);
        initialClients.push(client);
        handleClientChange(client.id);
    };

    const handleCategoryChange = (catId: string, name: string) => {
        const newCategories = estimate.itemCategories.map(cat => cat.id === catId ? { ...cat, name } : cat);
        setEstimate({ ...estimate, itemCategories: newCategories });
    };

    const handleItemChange = (catId: string, itemId: string, field: keyof Omit<LineItem, 'id'>, value: string | number | boolean) => {
        const newCategories = estimate.itemCategories.map(cat => {
            if (cat.id === catId) {
                const newItems = cat.items.map(item => {
                    if (item.id === itemId) {
                        return { ...item, [field]: value };
                    }
                    return item;
                });
                return { ...cat, items: newItems };
            }
            return cat;
        });
        setEstimate({ ...estimate, itemCategories: newCategories });
    };

    const addCategory = () => {
        const newCategory: ItemCategory = {
            id: `cat-${Date.now()}`,
            name: 'Nouvelle Désignation',
            items: []
        };
        setEstimate({ ...estimate, itemCategories: [...estimate.itemCategories, newCategory]});
    };

    const addItem = (catId: string) => {
        const newItem: LineItem = { id: `item-${Date.now()}`, name: '', quantity: 1, unitPrice: 0 };
        const newCategories = estimate.itemCategories.map(cat => {
            if (cat.id === catId) {
                return { ...cat, items: [...cat.items, newItem] };
            }
            return cat;
        });
        setEstimate({ ...estimate, itemCategories: newCategories });
    };

    const removeCategory = (catId: string) => {
        setEstimate({ ...estimate, itemCategories: estimate.itemCategories.filter(c => c.id !== catId) });
    };

    const removeItem = (catId: string, itemId: string) => {
        const newCategories = estimate.itemCategories.map(cat => {
            if (cat.id === catId) {
                return { ...cat, items: cat.items.filter(i => i.id !== itemId) };
            }
            return cat;
        });
        setEstimate({ ...estimate, itemCategories: newCategories });
    };

    const handleSave = () => {
        if (!estimate.clientId) {
            toast.error('Please select a client');
            return;
        }

        // Check if we're editing an existing estimate or creating a new one
        if (existingEstimate) {
            // Update existing estimate
            const updatedEstimate: Estimate = {
                ...existingEstimate,
                ...estimate,
                id: existingEstimate.id,
                estimateNumber: existingEstimate.estimateNumber,
            };

            // Update in data context
            const updatedEstimates = data.estimates.map(est =>
                est.id === existingEstimate.id ? updatedEstimate : est
            );
            updateData('estimates', updatedEstimates);

            toast.success('Estimate updated successfully!');
        } else {
            // Create new estimate with client-based numbering
            const selectedClient = clients.find(c => c.id === estimate.clientId);

            // Generate client prefix (first 4 characters, uppercase, alphanumeric only)
            let clientPrefix = 'XXXX';
            if (selectedClient) {
                const cleanName = selectedClient.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                clientPrefix = cleanName.substring(0, 4).padEnd(4, 'X');
            }

            // Get date in YYMMDD format
            const estimateDate = new Date(estimate.date);
            const yy = String(estimateDate.getFullYear()).slice(-2);
            const mm = String(estimateDate.getMonth() + 1).padStart(2, '0');
            const dd = String(estimateDate.getDate()).padStart(2, '0');

            // Count estimates for this client on this date
            const clientEstimatesToday = data.estimates.filter(est => {
                const estDate = new Date(est.date);
                return est.clientId === estimate.clientId &&
                    estDate.toISOString().split('T')[0] === estimate.date;
            });

            const sequenceNum = String(clientEstimatesToday.length + 1).padStart(3, '0');
            const newEstimateNumber = `${clientPrefix}-${yy}${mm}${dd}${sequenceNum}`;

            const finalEstimate: Estimate = {
                id: `est-${Date.now()}`,
                estimateNumber: newEstimateNumber,
                ...estimate as Omit<Estimate, 'id' | 'estimateNumber'>
            };

            // Add to data context
            const updatedEstimates = [...(data.estimates || []), finalEstimate];
            updateData('estimates', updatedEstimates);

            // Sync to calendar
            createCalendarEvent(finalEstimate, 'estimate');

            toast.success(`Estimate ${newEstimateNumber} created successfully!`);
        }

        navigate('/payments?tab=estimates');
    };

    const selectedClient = clients.find(c => c.id === estimate.clientId);

    return (
        <div className="bg-glass p-8 rounded-lg shadow-md border border-border-color">
            {/* Client Section */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Receiver</h3>
                    <div className="bg-glass-light p-4 rounded-lg border border-border-color min-h-[100px]">
                        {selectedClient ? (
                            <div>
                                <p className="font-bold text-text-primary">{selectedClient.name}</p>
                                <p className="text-sm text-text-secondary">{selectedClient.adresse}</p>
                                {selectedClient.adresse2 && (
                                    <p className="text-sm text-text-secondary">{selectedClient.adresse2}</p>
                                )}
                            </div>
                        ) : <p className="text-sm text-text-secondary">Select a client</p>}
                    </div>
                </div>
                <div>
                    <label htmlFor="client-select" className="block text-sm font-medium text-text-secondary mb-1">Select Client</label>
                    <select id="client-select" value={estimate.clientId} onChange={e => handleClientChange(e.target.value)} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                        <option value="">-- Choose a client --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={() => setIsClientModalOpen(true)} className="mt-2 text-sm font-medium text-primary hover:text-primary-hover">+ Add New Client</button>
                </div>
            </div>

            {/* Date Section */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <label htmlFor="estimate-date" className="block text-sm font-medium text-text-secondary mb-1">Estimate Date</label>
                    <input
                        id="estimate-date"
                        type="date"
                        value={estimate.date}
                        onChange={e => setEstimate({ ...estimate, date: e.target.value })}
                        className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="estimate-due-date" className="block text-sm font-medium text-text-secondary mb-1">Due Date (Optional)</label>
                    <input
                        id="estimate-due-date"
                        type="date"
                        value={estimate.dueDate || ''}
                        onChange={e => setEstimate({ ...estimate, dueDate: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
            </div>

            {/* Assigned Users Section */}
            <div className="mb-8">
                <label htmlFor="assigned-users" className="block text-sm font-medium text-text-secondary mb-1">Assign Users (Optional)</label>
                <select
                    id="assigned-users"
                    multiple
                    value={estimate.assignedUserIds || []}
                    onChange={e => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setEstimate({ ...estimate, assignedUserIds: selected });
                    }}
                    className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    size={4}
                >
                    {(data.users || []).map((user: User) => (
                        <option key={user.id} value={user.id}>
                            {user.name || `${user.firstName} ${user.lastName}`}
                        </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-text-secondary">Hold Ctrl/Cmd to select multiple users. These users will receive calendar events for the due date.</p>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
                {estimate.itemCategories.map(cat => (
                    <div key={cat.id} className="p-4 rounded-lg bg-glass-light border border-border-color">
                        <div className="flex justify-between items-center mb-2">
                            <input type="text" value={cat.name} onChange={e => handleCategoryChange(cat.id, e.target.value)} className="font-bold text-text-primary bg-transparent text-lg focus:outline-none w-full" />
                            <button onClick={() => removeCategory(cat.id)} className="text-red-400 hover:text-red-600">&times;</button>
                        </div>
                        {cat.items.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center mt-2">
                                <input
                                    type="checkbox"
                                    checked={item.hasAsterisk || false}
                                    onChange={e => handleItemChange(cat.id, item.id, 'hasAsterisk', e.target.checked)}
                                    className="col-span-1 h-4 w-4 text-primary border-border-color rounded focus:ring-primary"
                                    title="Mark with asterisk for terms & conditions"
                                />
                                <input type="text" placeholder="Item name" value={item.name} onChange={e => handleItemChange(cat.id, item.id, 'name', e.target.value)} className="col-span-5 bg-glass border border-border-color rounded px-2 py-1 text-sm" />
                                <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(cat.id, item.id, 'quantity', parseFloat(e.target.value) || 0)} className="col-span-2 bg-glass border border-border-color rounded px-2 py-1 text-sm" />
                                <input type="number" placeholder="Price" value={item.unitPrice} onChange={e => handleItemChange(cat.id, item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="col-span-2 bg-glass border border-border-color rounded px-2 py-1 text-sm" />
                                <p className="col-span-1 text-right text-sm">{(item.quantity * item.unitPrice).toFixed(2)}</p>
                                <button onClick={() => removeItem(cat.id, item.id)} className="col-span-1 text-center text-text-secondary hover:text-red-500">
                                    &#x1F5D1;
                                </button>
                            </div>
                        ))}
                        <button onClick={() => addItem(cat.id)} className="mt-2 text-sm font-medium text-primary hover:text-primary-hover">+ Add Item</button>
                    </div>
                ))}
            </div>
            <button onClick={addCategory} className="mt-4 px-4 py-2 border border-dashed border-border-color text-text-secondary text-sm font-medium rounded-lg hover:bg-glass-light hover:text-text-primary w-full">
                + Add New Section
            </button>

            {/* Asterisk Terms & Conditions Section */}
            {estimate.itemCategories.some(cat => cat.items.some(item => item.hasAsterisk)) && (
                <div className="mt-8 p-4 bg-glass-light rounded-lg border border-border-color">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Asterisk Terms & Conditions</h3>
                    <p className="text-sm text-text-secondary mb-4">Enter detailed terms and conditions for items marked with an asterisk. These will appear on a separate page in the estimate PDF.</p>
                    <div className="space-y-4">
                        {estimate.itemCategories.flatMap(cat =>
                            cat.items.filter(item => item.hasAsterisk).map((item, index) => (
                                <div key={item.id} className="p-3 bg-glass rounded-lg border border-border-color">
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs mr-2">
                                            {index + 1}
                                        </span>
                                        {item.name}
                                    </label>
                                    <textarea
                                        value={item.asteriskNote || ''}
                                        onChange={e => {
                                            const catId = cat.id;
                                            handleItemChange(catId, item.id, 'asteriskNote', e.target.value);
                                        }}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-border-color bg-glass text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                        placeholder="Enter specific terms and conditions for this item..."
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Totals */}
             <div className="flex justify-end mt-8">
                <div className="text-right">
                    <div className="flex justify-end items-center">
                        <span className="text-text-secondary font-medium">Subtotal:</span>
                        <span className="ml-4 w-32 text-text-primary font-semibold">{estimate.totals.subtotal.toFixed(2)} MAD</span>
                    </div>
                     <div className="flex justify-end items-center mt-2 text-xl">
                        <span className="text-text-primary font-bold">Total Net:</span>
                        <span className="ml-4 w-32 text-primary font-bold">{estimate.totals.totalNet.toFixed(2)} MAD</span>
                    </div>
                </div>
            </div>
             <div className="flex justify-end gap-4 mt-8">
                <button onClick={() => navigate('/payments?tab=estimates')} className="px-6 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                <button onClick={handleSave} className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover">Save Estimate</button>
             </div>

            {isClientModalOpen && <AddClientModal onClose={() => setIsClientModalOpen(false)} onAddClient={handleAddClient} />}
        </div>
    );
};

export default EstimateForm;
