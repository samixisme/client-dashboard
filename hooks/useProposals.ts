import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { Proposal, ProposalStatus } from '../types';
import { toast } from 'sonner';

export interface UseProposalsReturn {
    proposals: Proposal[];
    loading: boolean;
    addProposal: (title: string, description: string) => Promise<void>;
    updateProposal: (id: string, title: string, description: string) => Promise<void>;
    deleteProposal: (id: string) => Promise<void>;
    updateProposalStatus: (id: string, newStatus: ProposalStatus) => Promise<void>;
}

export const useProposals = (): UseProposalsReturn => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'proposals'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const items = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                })) as Proposal[];
                setProposals(items);
                setLoading(false);
            },
            () => {
                toast.error('Failed to load proposals');
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const addProposal = async (title: string, description: string) => {
        const user = auth.currentUser;
        await addDoc(collection(db, 'proposals'), {
            title,
            description,
            submitter: user?.displayName || user?.email || 'Unknown',
            submitterId: user?.uid || '',
            status: 'Pending' as ProposalStatus,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        toast.success('Proposal created');
    };

    const updateProposal = async (id: string, title: string, description: string) => {
        const ref = doc(db, 'proposals', id);
        await updateDoc(ref, { title, description, updatedAt: new Date().toISOString() });
        toast.success('Proposal updated');
    };

    const deleteProposal = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'proposals', id));
            toast.success('Proposal deleted');
        } catch {
            toast.error('Failed to delete proposal');
        }
    };

    const updateProposalStatus = async (id: string, newStatus: ProposalStatus) => {
        try {
            await updateDoc(doc(db, 'proposals', id), {
                status: newStatus,
                updatedAt: new Date().toISOString(),
            });
        } catch {
            toast.error('Failed to update status');
        }
    };

    return {
        proposals,
        loading,
        addProposal,
        updateProposal,
        deleteProposal,
        updateProposalStatus,
    };
};