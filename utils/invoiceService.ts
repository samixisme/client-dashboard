import { addDoc, collection, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { stripUndefined } from './firestore';
import { invoiceStatusSchema, estimateStatusSchema, InvoiceStatus, EstimateStatus } from './invoiceSchemas';
import { toast } from 'sonner';

// ── Invoice CRUD ───────────────────────────────────────────────────────────────

export async function createInvoice(data: Record<string, unknown>): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const docRef = await addDoc(
        collection(db, 'invoices'),
        stripUndefined({
            ...data,
            createdBy: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        })
    );
    return docRef.id;
}

export async function updateInvoice(id: string, data: Record<string, unknown>): Promise<void> {
    await updateDoc(doc(db, 'invoices', id), stripUndefined({
        ...data,
        updatedAt: serverTimestamp(),
    }));
}

export async function deleteInvoice(id: string): Promise<void> {
    await deleteDoc(doc(db, 'invoices', id));
}

// ── Estimate CRUD ──────────────────────────────────────────────────────────────

export async function createEstimate(data: Record<string, unknown>): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const docRef = await addDoc(
        collection(db, 'estimates'),
        stripUndefined({
            ...data,
            createdBy: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        })
    );
    return docRef.id;
}

export async function updateEstimate(id: string, data: Record<string, unknown>): Promise<void> {
    await updateDoc(doc(db, 'estimates', id), stripUndefined({
        ...data,
        updatedAt: serverTimestamp(),
    }));
}

export async function deleteEstimate(id: string): Promise<void> {
    await deleteDoc(doc(db, 'estimates', id));
}

// ── Status updates ─────────────────────────────────────────────────────────────

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
    invoiceStatusSchema.parse(status); // validate before touching Firestore
    try {
        await updateDoc(doc(db, 'invoices', id), { status, updatedAt: serverTimestamp() });
    } catch (err) {
        toast.error('Failed to update invoice status');
        throw err;
    }
}

export async function updateEstimateStatus(id: string, status: EstimateStatus): Promise<void> {
    estimateStatusSchema.parse(status);
    try {
        await updateDoc(doc(db, 'estimates', id), { status, updatedAt: serverTimestamp() });
    } catch (err) {
        toast.error('Failed to update estimate status');
        throw err;
    }
}

// ── Estimate → Invoice conversion ──────────────────────────────────────────────

export async function convertEstimateToInvoice(estimateId: string): Promise<string> {
    const snap = await getDoc(doc(db, 'estimates', estimateId));
    if (!snap.exists()) throw new Error(`Estimate ${estimateId} not found`);

    const est = snap.data();

    // Compute due date 30 days from today
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoiceData = stripUndefined({
        clientId: est.clientId,
        userId: est.userId,
        itemCategories: est.itemCategories,
        note: est.note,
        terms: est.terms,
        totals: est.totals,
        invoiceNumber: `INV-${Date.now()}`,
        status: 'Draft' as InvoiceStatus,
        date: new Date().toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
    });

    const newInvoiceId = await createInvoice(invoiceData);

    // Mark estimate as accepted and link converted invoice
    await updateDoc(doc(db, 'estimates', estimateId), {
        status: 'Accepted',
        convertedInvoiceId: newInvoiceId,
        updatedAt: serverTimestamp(),
    });

    return newInvoiceId;
}
