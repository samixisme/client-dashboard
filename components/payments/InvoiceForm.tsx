
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clients as initialClients, invoices } from '../../data/paymentsData';
import { Invoice, Client, ItemCategory, LineItem } from '../../types';
import AddClientModal from './AddClientModal';
import { createCalendarEvent } from '../../utils/calendarSync';

const InvoiceForm = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState<Client[]>(initialClients);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [invoice, setInvoice] = useState<Omit<Invoice, 'id' | 'invoiceNumber'>>({
        userId: 'user-1',
        clientId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Draft',
        itemCategories: [],
        note: '',
        terms: 'Paiement à 30 jours.',
        totals: { subtotal: 0, totalNet: 0 },
    });

    useEffect(() => {
        const subtotal = invoice.itemCategories.reduce((catTotal, category) => {
            const itemsTotal = category.items.reduce((itemTotal, item) => {
                return itemTotal + (item.quantity * item.unitPrice);
            }, 0);
            return catTotal + itemsTotal;
        }, 0);
        
        setInvoice(inv => ({ ...inv, totals: { subtotal, totalNet: subtotal } }));
    }, [invoice.itemCategories]);

    const handleClientChange = (clientId: string) => {
        setInvoice({ ...invoice, clientId });
    };
    
    const handleAddClient = (client: Client) => {
        const newClients = [...clients, client];
        setClients(newClients);
        initialClients.push(client); // Persist to mock data
        handleClientChange(client.id);
    };

    const handleCategoryChange = (catId: string, name: string) => {
        const newCategories = invoice.itemCategories.map(cat => cat.id === catId ? { ...cat, name } : cat);
        setInvoice({ ...invoice, itemCategories: newCategories });
    };

    const handleItemChange = (catId: string, itemId: string, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
        const newCategories = invoice.itemCategories.map(cat => {
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
        setInvoice({ ...invoice, itemCategories: newCategories });
    };
    
    const addCategory = () => {
        const newCategory: ItemCategory = {
            id: `cat-${Date.now()}`,
            name: 'Nouvelle Désignation',
            items: []
        };
        setInvoice({ ...invoice, itemCategories: [...invoice.itemCategories, newCategory]});
    };
    
    const addItem = (catId: string) => {
        const newItem: LineItem = { id: `item-${Date.now()}`, name: '', quantity: 1, unitPrice: 0 };
        const newCategories = invoice.itemCategories.map(cat => {
            if (cat.id === catId) {
                return { ...cat, items: [...cat.items, newItem] };
            }
            return cat;
        });
        setInvoice({ ...invoice, itemCategories: newCategories });
    };

    const removeCategory = (catId: string) => {
        setInvoice({ ...invoice, itemCategories: invoice.itemCategories.filter(c => c.id !== catId) });
    };
    
    const removeItem = (catId: string, itemId: string) => {
        const newCategories = invoice.itemCategories.map(cat => {
            if (cat.id === catId) {
                return { ...cat, items: cat.items.filter(i => i.id !== itemId) };
            }
            return cat;
        });
        setInvoice({ ...invoice, itemCategories: newCategories });
    };

    const handleSave = () => {
        if (!invoice.clientId) {
            alert("Please select a client.");
            return;
        }
        const newInvoiceNumber = `2024-${String(invoices.length + 1).padStart(3, '0')}`;
        const finalInvoice: Invoice = {
            id: `inv-${Date.now()}`,
            invoiceNumber: newInvoiceNumber,
            ...invoice
        };
        invoices.push(finalInvoice);
        
        // Sync to calendar
        createCalendarEvent(finalInvoice, 'invoice');

        console.log("Invoice saved:", finalInvoice);
        navigate('/payments');
    };

    const selectedClient = clients.find(c => c.id === invoice.clientId);

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
                            </div>
                        ) : <p className="text-sm text-text-secondary">Select a client</p>}
                    </div>
                </div>
                <div>
                    <label htmlFor="client-select" className="block text-sm font-medium text-text-secondary mb-1">Select Client</label>
                    <select id="client-select" value={invoice.clientId} onChange={e => handleClientChange(e.target.value)} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                        <option value="">-- Choose a client --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={() => setIsClientModalOpen(true)} className="mt-2 text-sm font-medium text-primary hover:text-primary-hover">+ Add New Client</button>
                </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
                {invoice.itemCategories.map(cat => (
                    <div key={cat.id} className="p-4 rounded-lg bg-glass-light border border-border-color">
                        <div className="flex justify-between items-center mb-2">
                            <input type="text" value={cat.name} onChange={e => handleCategoryChange(cat.id, e.target.value)} className="font-bold text-text-primary bg-transparent text-lg focus:outline-none w-full" />
                            <button onClick={() => removeCategory(cat.id)} className="text-red-400 hover:text-red-600">&times;</button>
                        </div>
                        {cat.items.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center mt-2">
                                <input type="text" placeholder="Item name" value={item.name} onChange={e => handleItemChange(cat.id, item.id, 'name', e.target.value)} className="col-span-6 bg-glass border border-border-color rounded px-2 py-1 text-sm" />
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

            {/* Totals & Notes */}
             <div className="grid grid-cols-2 gap-8 mt-8">
                <div>
                     <label htmlFor="notes" className="block text-sm font-medium text-text-secondary mb-1">Note</label>
                     <textarea id="notes" rows={3} value={invoice.note} onChange={e => setInvoice({...invoice, note: e.target.value})} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"></textarea>
                </div>
                <div className="text-right">
                    <div className="flex justify-end items-center">
                        <span className="text-text-secondary font-medium">Subtotal:</span>
                        <span className="ml-4 w-32 text-text-primary font-semibold">{invoice.totals.subtotal.toFixed(2)} MAD</span>
                    </div>
                     <div className="flex justify-end items-center mt-2 text-xl">
                        <span className="text-text-primary font-bold">Total Net:</span>
                        <span className="ml-4 w-32 text-primary font-bold">{invoice.totals.totalNet.toFixed(2)} MAD</span>
                    </div>
                </div>
            </div>

             {/* Terms & Actions */}
             <div className="mt-8">
                <label htmlFor="terms" className="block text-sm font-medium text-text-secondary mb-1">Terms & Conditions</label>
                <textarea id="terms" rows={3} value={invoice.terms} onChange={e => setInvoice({...invoice, terms: e.target.value})} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"></textarea>
             </div>
             <div className="flex justify-end gap-4 mt-8">
                <button onClick={() => navigate('/payments')} className="px-6 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                <button onClick={handleSave} className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover">Save Invoice</button>
             </div>

            {isClientModalOpen && <AddClientModal onClose={() => setIsClientModalOpen(false)} onAddClient={handleAddClient} />}
        </div>
    );
};

export default InvoiceForm;