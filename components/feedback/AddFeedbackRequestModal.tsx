
import React, { useState } from 'react';
import { AddIcon } from '../icons/AddIcon';
import { WebsiteIcon } from '../icons/WebsiteIcon';
import { MockupIcon } from '../icons/MockupIcon';
import { VideoIcon } from '../icons/VideoIcon';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { FeedbackType } from '../../types';
import { addFeedbackItem } from '../../utils/feedbackUtils';
import { uploadFile } from '../../utils/firebase';
import { toast } from 'sonner';
import { Textarea } from '../ui/textarea';

interface AddFeedbackRequestModalProps {
    projectId: string;
    onClose: () => void;
}

const AddFeedbackRequestModal: React.FC<AddFeedbackRequestModalProps> = ({ projectId, onClose }) => {
    const [step, setStep] = useState(1);
    const [type, setType] = useState<FeedbackType | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState(''); // For websites
    const [file, setFile] = useState<File | null>(null); // For mockups/videos
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleTypeSelect = (selectedType: FeedbackType) => {
        setType(selectedType);
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
        // Reset form fields when going back
        setName('');
        setDescription('');
        setUrl('');
        setFile(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!type || !name.trim()) return;

        setIsSubmitting(true);

        try {
            let assetUrl = '';

            if (type === 'website') {
                assetUrl = url;
            } else if (file) {
                // Upload file to Firebase Storage
                const path = `projects/${projectId}/feedback/${type}s`;
                assetUrl = await uploadFile(file, path);
            }

            if (!assetUrl) {
                toast.error('Please provide a URL or upload a file');
                setIsSubmitting(false);
                return;
            }

            // Create Feedback Item in Firestore
            await addFeedbackItem(projectId, {
                type,
                name,
                description,
                assetUrl,
                status: 'pending',
                createdBy: 'currentUser', // Replace with actual user ID from Auth Context
            });

            toast.success('Feedback request created');
            onClose();
        } catch (error) {
            console.error("Error creating feedback item:", error);
            toast.error('Failed to create feedback item');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const TypeButton = ({ Icon, title, onClick }: { Icon: React.FC<any>, title: string, onClick: () => void }) => (
        <button onClick={onClick} className="w-full text-left p-5 bg-glass-light/60 backdrop-blur-sm rounded-xl border border-border-color hover:border-primary hover:bg-glass-light hover:scale-105 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors duration-300">
                <Icon className="h-8 w-8 text-primary group-hover:rotate-12 transition-transform duration-300"/>
            </div>
            <span className="font-bold text-text-primary group-hover:text-primary transition-colors duration-300">{title}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-glass/90 backdrop-blur-xl w-full max-w-lg rounded-2xl shadow-2xl border border-border-color animate-scale-in" onClick={e => e.stopPropagation()}>
                {step === 1 && (
                    <div className="p-8">
                        <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">What would you like to get feedback on?</h2>
                        <div className="space-y-3">
                            <TypeButton Icon={WebsiteIcon} title="Add a Website" onClick={() => handleTypeSelect('website')} />
                            <TypeButton Icon={MockupIcon} title="Upload a Mockup" onClick={() => handleTypeSelect('mockup')} />
                            <TypeButton Icon={VideoIcon} title="Upload a Video" onClick={() => handleTypeSelect('video')} />
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <form onSubmit={handleSubmit} className="p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <button type="button" onClick={handleBack} className="p-2 rounded-lg hover:bg-glass-light hover:scale-110 transition-all duration-300"><ArrowLeftIcon className="h-5 w-5"/></button>
                            <h2 className="text-2xl font-bold text-text-primary">New {type} Feedback</h2>
                        </div>
                        <div className="space-y-4">
                            <InputField label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Homepage Redesign v1" required disabled={isSubmitting}/>
                            <TextAreaField label="Description (Optional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief description of this feedback request." disabled={isSubmitting}/>

                            {type === 'website' && (
                                <InputField label="URL" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" required disabled={isSubmitting}/>
                            )}

                            {(type === 'mockup' || type === 'video') && (
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Upload File</label>
                                    <input
                                        type="file"
                                        accept={type === 'mockup' ? "image/*" : "video/*"}
                                        onChange={handleFileChange}
                                        className="w-full text-text-primary bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-xl p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-background hover:file:bg-primary-hover file:cursor-pointer transition-all duration-300"
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-glass-light/60 backdrop-blur-sm text-text-primary text-sm font-medium rounded-xl hover:bg-border-color hover:scale-105 transition-all duration-300 border border-border-color" disabled={isSubmitting}>Cancel</button>
                            <button type="submit" className="px-5 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                                {isSubmitting ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const InputField = (props: React.InputHTMLAttributes<HTMLInputElement> & {label: string}) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">{props.label}</label>
        <input {...props} className="w-full px-4 py-3 border border-border-color bg-glass-light/60 backdrop-blur-sm text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50 sm:text-sm disabled:opacity-50 transition-all duration-300 placeholder:text-text-secondary" />
    </div>
);

const TextAreaField = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {label: string}) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">{props.label}</label>
        <Textarea {...props} rows={3} className="px-4 py-3 bg-glass-light/60 rounded-xl focus:ring-2 focus:ring-primary sm:text-sm disabled:opacity-50" />
    </div>
);

export default AddFeedbackRequestModal;
