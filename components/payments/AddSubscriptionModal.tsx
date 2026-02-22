import React, { useState } from 'react';
import { Client } from '../../types';
import { toast } from 'sonner';

interface AddSubscriptionModalProps {
  clients: Client[];
  onClose: () => void;
  onSuccess: () => void;
}

const BILLING_CYCLES = [
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (every 3 months)' },
  { value: 'yearly',    label: 'Yearly' },
] as const;

export const AddSubscriptionModal: React.FC<AddSubscriptionModalProps> = ({
  clients,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    planName: '',
    price: '',
    billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const selectedClient = clients.find(c => c.id === form.clientId);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!form.planName.trim()) {
      toast.error('Please enter a plan name');
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Sync the client to Paymenter (create if doesn't exist)
      const clientRes = await fetch('/api/paymenter/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedClient!.name,
          email: `${selectedClient!.id}@client.local`, // placeholder if no email
          address: selectedClient!.adresse ?? '',
        }),
      });
      const clientData = await clientRes.json();

      if (!clientData.success) {
        throw new Error(clientData.error ?? 'Failed to sync client to Paymenter');
      }

      const paymenterClientId: number = clientData.data?.id;

      // 2. Create the subscription
      const subRes = await fetch('/api/paymenter/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymenterClientId,
          productId: 1, // Default product — can be made dynamic later
          billingCycle: form.billingCycle,
          price,
          planName: form.planName.trim(),
          notes: form.notes.trim(),
        }),
      });
      const subData = await subRes.json();

      if (!subData.success) {
        throw new Error(subData.error ?? 'Failed to create subscription');
      }

      toast.success('Subscription created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-glass/90 backdrop-blur-2xl border border-border-color rounded-2xl shadow-2xl animate-scale-in"
        style={{ background: 'rgba(18,18,18,0.95)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-color">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.091 1.21-.138 2.43-.138 3.662m14.324 0c0 1.232-.046 2.453-.138 3.662a4.006 4.006 0 01-3.7 3.7 48.678 48.678 0 01-7.324 0 4.006 4.006 0 01-3.7-3.7c-.091-1.21-.138-2.43-.138-3.662m14.324 0l-2.06-2.06m0 0l-2.06 2.06" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-text-primary">New Subscription</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-glass/60 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Client selector */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Client *
            </label>
            <select
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 bg-glass/40 border border-border-color rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200 cursor-pointer"
            >
              <option value="">Select a client…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Plan name */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Plan / Service Name *
            </label>
            <input
              type="text"
              name="planName"
              value={form.planName}
              onChange={handleChange}
              placeholder="e.g. Web Hosting Pro, VPS Server…"
              required
              className="w-full px-3 py-2.5 bg-glass/40 border border-border-color rounded-xl text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200"
            />
          </div>

          {/* Price + Cycle row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Price (MAD) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                  className="w-full px-3 py-2.5 pr-14 bg-glass/40 border border-border-color rounded-xl text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">MAD</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Billing Cycle
              </label>
              <select
                name="billingCycle"
                value={form.billingCycle}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-glass/40 border border-border-color rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200 cursor-pointer"
              >
                {BILLING_CYCLES.map(cycle => (
                  <option key={cycle.value} value={cycle.value}>{cycle.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              className="w-full px-3 py-2.5 bg-glass/40 border border-border-color rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Notes (optional)
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Server specs, special terms…"
              rows={2}
              className="w-full px-3 py-2.5 bg-glass/40 border border-border-color rounded-xl text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-glass/40 border border-border-color text-text-secondary rounded-xl text-sm font-semibold hover:text-text-primary hover:bg-glass/60 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-primary text-background rounded-xl text-sm font-bold hover:bg-primary-hover hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating…' : 'Create Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
