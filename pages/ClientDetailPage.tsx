import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useData } from '../contexts/DataContext';
import { Invoice, Estimate, Project } from '../types';

const ClientDetailPage: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const navigate = useNavigate();
    const { data } = useData();

    const client = data.clients.find(c => c.id === clientId);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        if (!clientId) return;

        const unsubInvoices = onSnapshot(
            query(collection(db, 'invoices'), where('clientId', '==', clientId)),
            snap => setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)))
        );

        const unsubEstimates = onSnapshot(
            query(collection(db, 'estimates'), where('clientId', '==', clientId)),
            snap => setEstimates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Estimate)))
        );

        const unsubProjects = onSnapshot(
            query(collection(db, 'projects'), where('clientId', '==', clientId)),
            snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)))
        );

        return () => {
            unsubInvoices();
            unsubEstimates();
            unsubProjects();
        };
    }, [clientId]);

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-text-secondary">
                <p className="text-lg">Client not found.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-primary hover:underline text-sm">
                    Go back
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-text-primary transition-colors">
                    ← Back
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">{client.name}</h1>
                    {client.adresse && (
                        <p className="text-text-secondary mt-1">
                            {client.adresse}{client.adresse2 ? `, ${client.adresse2}` : ''}
                        </p>
                    )}
                </div>
            </div>

            {/* Info card */}
            <div className="bg-glass rounded-lg border border-border-color p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <InfoField label="ICE" value={client.ice} />
                <InfoField label="RC" value={client.rc} />
                <InfoField label="IF" value={client.if} />
            </div>

            {/* Projects */}
            <Section title="Projects" count={projects.length}>
                {projects.length === 0 ? (
                    <Empty message="No projects linked to this client." />
                ) : (
                    <ul className="divide-y divide-border-color">
                        {projects.map(p => (
                            <li key={p.id} className="px-4 py-3 text-sm text-text-primary flex items-center justify-between">
                                <span>{p.name}</span>
                                <span className="text-text-secondary text-xs capitalize">{p.status}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            {/* Invoices */}
            <Section title="Invoices" count={invoices.length}>
                {invoices.length === 0 ? (
                    <Empty message="No invoices for this client." />
                ) : (
                    <ul className="divide-y divide-border-color">
                        {invoices.map(inv => (
                            <li key={inv.id} className="px-4 py-3 text-sm text-text-primary flex items-center justify-between">
                                <span>{inv.invoiceNumber || inv.id}</span>
                                <span className="text-text-secondary text-xs capitalize">{inv.status || '-'}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            {/* Estimates */}
            <Section title="Estimates" count={estimates.length}>
                {estimates.length === 0 ? (
                    <Empty message="No estimates for this client." />
                ) : (
                    <ul className="divide-y divide-border-color">
                        {estimates.map(est => (
                            <li key={est.id} className="px-4 py-3 text-sm text-text-primary flex items-center justify-between">
                                <span>{est.estimateNumber || est.id}</span>
                                <span className="text-text-secondary text-xs capitalize">{est.status || '-'}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>
        </div>
    );
};

const InfoField: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">{label}</p>
        <p className="text-sm text-text-primary font-medium">{value || '—'}</p>
    </div>
);

const Section: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => (
    <div className="bg-glass rounded-lg border border-border-color overflow-hidden">
        <div className="px-4 py-3 border-b border-border-color flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            <span className="text-xs text-text-secondary bg-glass-light px-2 py-0.5 rounded-full">{count}</span>
        </div>
        {children}
    </div>
);

const Empty: React.FC<{ message: string }> = ({ message }) => (
    <p className="px-4 py-6 text-sm text-text-secondary text-center">{message}</p>
);

export default ClientDetailPage;
