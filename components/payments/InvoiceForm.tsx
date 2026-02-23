
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoices } from '../../data/paymentsData';
import { Invoice, Client, ItemCategory, LineItem, User } from '../../types';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import AddClientModal from './AddClientModal';
import { Textarea } from '../ui/textarea';
import { createCalendarEvent } from '../../utils/calendarSync';
import { useData } from '../../contexts/DataContext';
import { toast } from 'sonner';
import { DatePicker } from '../../src/components/ui/date-picker';

interface InvoiceFormProps {
    existingInvoice?: Invoice;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ existingInvoice }) => {
    const navigate = useNavigate();
    const { data, updateData } = useData();
    const [clients, setClients] = useState<Client[]>(data.clients || []);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [invoice, setInvoice] = useState<Omit<Invoice, 'id' | 'invoiceNumber'> & { id?: string; invoiceNumber?: string }>(
        existingInvoice || {
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

    // Animation styles
    const animationStyles = `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 8px var(--primary);
          }
          50% {
            box-shadow: 0 0 20px var(--primary);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }

        .animate-slide-in-right {
          animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2.5s ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-scale-in {
          animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
    `;

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
    
    const handleAddClient = async (client: Omit<Client, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'clients'), client);
            const newClient = { ...client, id: docRef.id };
            setClients(prev => [...prev, newClient]);
            updateData('clients', [...data.clients, newClient]);
            handleClientChange(docRef.id);
        } catch {
            toast.error('Failed to add client');
        }
    };

    const handleCategoryChange = (catId: string, name: string) => {
        const newCategories = invoice.itemCategories.map(cat => cat.id === catId ? { ...cat, name } : cat);
        setInvoice({ ...invoice, itemCategories: newCategories });
    };

    const handleItemChange = (catId: string, itemId: string, field: keyof Omit<LineItem, 'id'>, value: string | number | boolean) => {
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
            toast.error('Please select a client');
            return;
        }

        // Check if we're editing an existing invoice or creating a new one
        if (existingInvoice) {
            // Update existing invoice
            const updatedInvoice: Invoice = {
                ...existingInvoice,
                ...invoice,
                id: existingInvoice.id,
                invoiceNumber: existingInvoice.invoiceNumber,
            };

            // Update in data context
            const updatedInvoices = data.invoices.map(inv =>
                inv.id === existingInvoice.id ? updatedInvoice : inv
            );
            updateData('invoices', updatedInvoices);

            toast.success('Invoice updated successfully!');
        } else {
            // Create new invoice with client-based numbering
            const selectedClient = clients.find(c => c.id === invoice.clientId);

            // Generate client prefix (first 4 characters, uppercase, alphanumeric only)
            let clientPrefix = 'XXXX';
            if (selectedClient) {
                const cleanName = selectedClient.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                clientPrefix = cleanName.substring(0, 4).padEnd(4, 'X');
            }

            // Get date in YYMMDD format
            const invoiceDate = new Date(invoice.date);
            const yy = String(invoiceDate.getFullYear()).slice(-2);
            const mm = String(invoiceDate.getMonth() + 1).padStart(2, '0');
            const dd = String(invoiceDate.getDate()).padStart(2, '0');

            // Count invoices for this client on this date
            const clientInvoicesToday = data.invoices.filter(inv => {
                const invDate = new Date(inv.date);
                return inv.clientId === invoice.clientId &&
                    invDate.toISOString().split('T')[0] === invoice.date;
            });

            const sequenceNum = String(clientInvoicesToday.length + 1).padStart(3, '0');
            const newInvoiceNumber = `${clientPrefix}-${yy}${mm}${dd}${sequenceNum}`;

            const finalInvoice: Invoice = {
                id: `inv-${Date.now()}`,
                invoiceNumber: newInvoiceNumber,
                ...invoice as Omit<Invoice, 'id' | 'invoiceNumber'>
            };

            // Add to data context
            const updatedInvoices = [...(data.invoices || []), finalInvoice];
            updateData('invoices', updatedInvoices);

            // Sync to calendar
            createCalendarEvent(finalInvoice, 'invoice');

            toast.success(`Invoice ${newInvoiceNumber} created successfully!`);
        }

        navigate('/payments');
    };

    const selectedClient = clients.find(c => c.id === invoice.clientId);

    return (
        <>
            <style>{animationStyles}</style>
            <div className="bg-glass/40 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-border-color hover:shadow-2xl transition-all duration-500 relative overflow-hidden group">
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            {/* Client Section */}
            <div className="grid grid-cols-2 gap-8 mb-8 animate-fade-in-up relative z-10" style={{ animationDelay: '0ms' }}>
                <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Receiver</h3>
                    <div className="bg-glass-light/60 backdrop-blur-sm p-4 rounded-xl border border-border-color/50 shadow-md hover:shadow-lg transition-all duration-300 min-h-[100px]">
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
                    <select id="client-select" value={invoice.clientId} onChange={e => handleClientChange(e.target.value)} className="w-full px-3 py-2 border border-border-color bg-glass-light/80 backdrop-blur-sm text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all duration-300 sm:text-sm">
                        <option value="">-- Choose a client --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={() => setIsClientModalOpen(true)} className="mt-2 text-sm font-medium text-primary hover:text-primary-hover hover:scale-105 transition-all duration-300">+ Add New Client</button>
                </div>
            </div>

            {/* Date Section */}
            <div className="grid grid-cols-2 gap-8 mb-8 animate-fade-in-up relative z-10" style={{ animationDelay: '100ms' }}>
                <div>
                    <label htmlFor="invoice-date" className="block text-sm font-medium text-text-secondary mb-1">Invoice Date</label>
                    <DatePicker
                        value={invoice.date ? new Date(invoice.date) : undefined}
                        onChange={(date) => setInvoice({ ...invoice, date: date ? date.toISOString().split('T')[0] : '' })}
                        placeholder="Select invoice date"
                    />
                </div>
                <div>
                    <label htmlFor="invoice-due-date" className="block text-sm font-medium text-text-secondary mb-1">Due Date (Optional)</label>
                    <DatePicker
                        value={invoice.dueDate ? new Date(invoice.dueDate) : undefined}
                        onChange={(date) => setInvoice({ ...invoice, dueDate: date ? date.toISOString().split('T')[0] : undefined })}
                        placeholder="Select due date"
                        minDate={invoice.date ? new Date(invoice.date) : undefined}
                    />
                </div>
            </div>

            {/* Assigned Users Section */}
            <div className="mb-8 animate-fade-in-up relative z-10" style={{ animationDelay: '200ms' }}>
                <label htmlFor="assigned-users" className="block text-sm font-medium text-text-secondary mb-1">Assign Users (Optional)</label>
                <select
                    id="assigned-users"
                    multiple
                    value={invoice.assignedUserIds || []}
                    onChange={e => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setInvoice({ ...invoice, assignedUserIds: selected });
                    }}
                    className="w-full px-3 py-2 border border-border-color bg-glass-light/80 backdrop-blur-sm text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all duration-300 sm:text-sm"
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
            <div className="space-y-4 relative z-10">
                {invoice.itemCategories.map((cat, index) => (
                    <div key={cat.id} className="p-4 rounded-xl bg-glass-light/60 backdrop-blur-sm border border-border-color/50 shadow-md hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `${300 + index * 50}ms` }}>
                        <div className="flex justify-between items-center mb-2">
                            <input type="text" value={cat.name} onChange={e => handleCategoryChange(cat.id, e.target.value)} className="font-bold text-text-primary bg-transparent text-lg focus:outline-none w-full transition-all duration-300" />
                            <button onClick={() => removeCategory(cat.id)} className="text-red-400 hover:text-red-600 hover:scale-125 transition-all duration-300">&times;</button>
                        </div>
                        {cat.items.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center mt-2 hover:bg-glass-light/30 p-2 rounded-lg transition-all duration-300">
                                <input
                                    type="checkbox"
                                    checked={item.hasAsterisk || false}
                                    onChange={e => handleItemChange(cat.id, item.id, 'hasAsterisk', e.target.checked)}
                                    className="col-span-1 h-4 w-4 text-primary border-border-color rounded focus:ring-primary transition-all duration-300"
                                    title="Mark with asterisk for terms & conditions"
                                />
                                <input type="text" placeholder="Item name" value={item.name} onChange={e => handleItemChange(cat.id, item.id, 'name', e.target.value)} className="col-span-5 bg-glass/80 backdrop-blur-sm border border-border-color rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all duration-300" />
                                <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(cat.id, item.id, 'quantity', parseFloat(e.target.value) || 0)} className="col-span-2 bg-glass/80 backdrop-blur-sm border border-border-color rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all duration-300" />
                                <input type="number" placeholder="Price" value={item.unitPrice} onChange={e => handleItemChange(cat.id, item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="col-span-2 bg-glass/80 backdrop-blur-sm border border-border-color rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all duration-300" />
                                <p className="col-span-1 text-right text-sm font-semibold text-text-primary">{(item.quantity * item.unitPrice).toFixed(2)}</p>
                                <button onClick={() => removeItem(cat.id, item.id)} className="col-span-1 text-center text-text-secondary hover:text-red-500 hover:scale-125 transition-all duration-300">
                                    &#x1F5D1;
                                </button>
                            </div>
                        ))}
                        <button onClick={() => addItem(cat.id)} className="mt-2 text-sm font-medium text-primary hover:text-primary-hover hover:scale-105 transition-all duration-300">+ Add Item</button>
                    </div>
                ))}
            </div>
            <button onClick={addCategory} className="mt-4 px-4 py-2 border border-dashed border-border-color/50 text-text-secondary text-sm font-medium rounded-xl hover:bg-glass-light/60 hover:text-primary hover:border-primary/50 hover:shadow-lg hover:scale-105 transition-all duration-300 w-full backdrop-blur-sm relative z-10">
                + Add New Section
            </button>

            {/* Asterisk Terms & Conditions Section */}
            {invoice.itemCategories.some(cat => cat.items.some(item => item.hasAsterisk)) && (
                <div className="mt-8 p-6 bg-glass-light/60 backdrop-blur-sm rounded-xl border border-border-color/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up relative z-10" style={{ animationDelay: '400ms' }}>
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Asterisk Terms & Conditions</h3>
                    <p className="text-sm text-text-secondary mb-4">Enter detailed terms and conditions for items marked with an asterisk. These will appear on a separate page in the invoice PDF.</p>
                    <div className="space-y-4">
                        {invoice.itemCategories.flatMap(cat =>
                            cat.items.filter(item => item.hasAsterisk).map((item, index) => (
                                <div key={item.id} className="p-4 bg-glass/60 backdrop-blur-sm rounded-xl border border-border-color/50 hover:shadow-md transition-all duration-300">
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs mr-2 shadow-lg">
                                            {index + 1}
                                        </span>
                                        {item.name}
                                    </label>
                                    <Textarea
                                        value={item.asteriskNote || ''}
                                        onChange={e => {
                                            const catId = cat.id;
                                            handleItemChange(catId, item.id, 'asteriskNote', e.target.value);
                                        }}
                                        rows={3}
                                        className="px-3 py-2 bg-glass/80 focus:ring-2 focus:ring-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                                        placeholder="Enter specific terms and conditions for this item..."
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Totals */}
             <div className="flex justify-end mt-8 animate-fade-in-up relative z-10" style={{ animationDelay: '500ms' }}>
                <div className="text-right bg-glass-light/60 backdrop-blur-sm rounded-xl p-6 border border-border-color/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex justify-end items-center">
                        <span className="text-text-secondary font-medium">Subtotal:</span>
                        <span className="ml-4 w-32 text-text-primary font-semibold">{invoice.totals.subtotal.toFixed(2)} MAD</span>
                    </div>
                     <div className="flex justify-end items-center mt-2 text-xl">
                        <span className="text-text-primary font-bold">Total Net:</span>
                        <span className="ml-4 w-32 text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]">{invoice.totals.totalNet.toFixed(2)} MAD</span>
                    </div>
                </div>
            </div>
             <div className="flex justify-end gap-4 mt-8 animate-fade-in-up relative z-10" style={{ animationDelay: '600ms' }}>
                <button onClick={() => navigate('/payments')} className="px-6 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-glass hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg">Cancel</button>
                <button onClick={handleSave} className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover hover:scale-110 hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] transition-all duration-300 shadow-lg relative overflow-hidden group/btn">
                    <span className="relative z-10">Save Invoice</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 animate-shimmer" />
                </button>
             </div>

            {isClientModalOpen && <AddClientModal onClose={() => setIsClientModalOpen(false)} onAddClient={handleAddClient} />}
        </div>
        </>
    );
};

export default InvoiceForm;