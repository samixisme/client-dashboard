
import { Client, Invoice, Estimate, UserSettings } from '../types';

export const userSettings: UserSettings = {
    userId: 'user-1',
    ae: 'Business Name',
    cnie: 'AB123456',
    ice: '001122334455667',
    if: '12345678',
    tp: '98765432',
    adresse_ae: '123 Main Street, Casablanca, Morocco',
    bankDetails: {
        codeBanque: '123',
        codeVille: '456',
        nDeCompte: '12345678901234567890',
        cleRib: '99',
        codeSwift: 'BCPOMAMC'
    },
    footerDetails: {
        adresseMail: 'contact@business.com',
        telephone: '+212 5 12 34 56 78',
        site: 'www.business.com'
    },
    legalNote: 'Art 219 de la loi 15-95 formant code de commerce le vendeur conserve la propriété des biens vendus jusqu’au paiement effectif de l’intégralité du prix en principal et accessoires.',
    signatureBoxClient: '',
    signatureBoxAutoEntrepreneur: ''
};

export let clients: Client[] = [
    { id: 'client-1', userId: 'user-1', brandId: 'brand-1', name: 'Innovate SARL', adresse: '456 Tech Park, Rabat', ice: '998877665544332', rc: 'RC12345', if: '87654321' },
    { id: 'client-2', userId: 'user-1', brandId: 'brand-2', name: 'Creative Minds Agency', adresse: '789 Design Hub, Marrakech', ice: '112233445566778', rc: 'RC67890', if: '11223344' },
];

export let invoices: Invoice[] = [
    { 
        id: 'inv-1', 
        userId: 'user-1', 
        clientId: 'client-1', 
        invoiceNumber: '2024-001',
        date: new Date('2024-07-15').toISOString(),
        status: 'Paid',
        itemCategories: [
            { id: 'cat-1', name: 'Développement Web', items: [
                { id: 'item-1', name: 'Conception UI/UX', quantity: 20, unitPrice: 500 },
                { id: 'item-2', name: 'Développement Frontend', quantity: 40, unitPrice: 600 },
            ]}
        ],
        note: 'Merci pour votre confiance.',
        terms: 'Paiement à 30 jours.',
        totals: { subtotal: 34000, totalNet: 34000 }
    },
     { 
        id: 'inv-2', 
        userId: 'user-1', 
        clientId: 'client-2', 
        invoiceNumber: '2024-002',
        date: new Date('2024-07-20').toISOString(),
        status: 'Sent',
        itemCategories: [
            { id: 'cat-2', name: 'Branding', items: [
                { id: 'item-3', name: 'Création de logo', quantity: 1, unitPrice: 15000 },
            ]}
        ],
        note: '',
        terms: 'Paiement à réception.',
        totals: { subtotal: 15000, totalNet: 15000 }
    }
];

export let estimates: Estimate[] = [
    { 
        id: 'est-1', 
        userId: 'user-1', 
        clientId: 'client-2', 
        estimateNumber: 'DEV-2024-001',
        date: new Date('2024-06-30').toISOString(),
        status: 'Sent',
        itemCategories: [
            { id: 'cat-3', name: 'Stratégie Digitale', items: [
                { id: 'item-4', name: 'Audit SEO', quantity: 1, unitPrice: 8000 },
                { id: 'item-5', name: 'Plan de contenu', quantity: 1, unitPrice: 12000 },
            ]}
        ],
        note: 'Proposition valable 30 jours.',
        terms: 'Acompte de 50% à la commande.',
        totals: { subtotal: 20000, totalNet: 20000 }
    }
];