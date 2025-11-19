
import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { FeedbackMockup, FeedbackWebsite, FeedbackVideo, MockupImage, VideoAsset } from '../../types';
import { WebsiteIcon } from '../icons/WebsiteIcon';
import { MockupIcon } from '../icons/MockupIcon';
import { VideoIcon } from '../icons/VideoIcon';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';

interface AddFeedbackRequestModalProps {
    projectId: string;
    onClose: () => void;
}

type FeedbackType = 'website' | 'mockup' | 'video';

const AddFeedbackRequestModal: React.FC<AddFeedbackRequestModalProps> = ({ projectId, onClose }) => {
    const { data, forceUpdate } = useData();
    const [step, setStep] = useState(1);
    const [type, setType] = useState<FeedbackType | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState(''); // For websites and videos
    const [imageUrls, setImageUrls] = useState(''); // For mockups

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
        setImageUrls('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!type || !name.trim()) return;

        switch (type) {
            case 'website':
                if (url.trim()) {
                    const newWebsite: FeedbackWebsite = { id: `web-${Date.now()}`, projectId, name, url, description, isApproved: false, pages: [], approvedPageIds: [] };
                    data.feedbackWebsites.push(newWebsite);
                }
                break;
            case 'mockup':
                if (imageUrls.trim()) {
                    const images: MockupImage[] = imageUrls.split(',').map((imgUrl, i) => ({ id: `img-${Date.now()}-${i}`, name: `Image ${i+1}`, url: imgUrl.trim() }));
                    const newMockup: FeedbackMockup = { id: `mock-${Date.now()}`, projectId, name, description, images, approvedImageIds: [] };
                    data.feedbackMockups.push(newMockup);
                }
                break;
            case 'video':
                 if (url.trim()) {
                    const videos: VideoAsset[] = url.split(',').map((vidUrl, i) => ({ id: `vid-asset-${Date.now()}-${i}`, name: `Video ${i+1}`, url: vidUrl.trim() }));
                    const newVideo: FeedbackVideo = { id: `vid-collection-${Date.now()}`, projectId, name, description, videos, approvedVideoIds: [] };
                    data.feedbackVideos.push(newVideo);
                }
                break;
        }
        
        forceUpdate();
        onClose();
    };
    
    const TypeButton = ({ Icon, title, onClick }: { Icon: React.FC<any>, title: string, onClick: () => void }) => (
        <button onClick={onClick} className="w-full text-left p-4 bg-glass-light rounded-lg border border-border-color hover:border-primary transition-colors flex items-center gap-4">
            <Icon className="h-8 w-8 text-primary"/>
            <span className="font-semibold text-text-primary">{title}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-glass w-full max-w-lg rounded-2xl shadow-xl border border-border-color" onClick={e => e.stopPropagation()}>
                {step === 1 && (
                    <div className="p-8">
                        <h2 className="text-xl font-bold text-text-primary mb-6 text-center">What would you like to get feedback on?</h2>
                        <div className="space-y-4">
                            <TypeButton Icon={WebsiteIcon} title="Add a Website" onClick={() => handleTypeSelect('website')} />
                            <TypeButton Icon={MockupIcon} title="Upload a Mockup" onClick={() => handleTypeSelect('mockup')} />
                            <TypeButton Icon={VideoIcon} title="Upload a Video" onClick={() => handleTypeSelect('video')} />
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <form onSubmit={handleSubmit} className="p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <button type="button" onClick={handleBack} className="p-2 rounded-full hover:bg-glass-light"><ArrowLeftIcon className="h-5 w-5"/></button>
                            <h2 className="text-xl font-bold text-text-primary">New {type} Feedback</h2>
                        </div>
                        <div className="space-y-4">
                            <InputField label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Homepage Redesign v1" required/>
                            <TextAreaField label="Description (Optional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief description of this feedback request."/>
                            {type === 'website' && <InputField label="URL" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" required/>}
                            {type === 'mockup' && <TextAreaField label="Image URLs" value={imageUrls} onChange={e => setImageUrls(e.target.value)} placeholder="Enter image URLs, separated by commas" required/>}
                            {type === 'video' && <TextAreaField label="Video URLs" value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter video URLs, separated by commas" required/>}
                        </div>
                        <div className="flex justify-end gap-4 mt-8">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Create</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const InputField = (props: React.InputHTMLAttributes<HTMLInputElement> & {label: string}) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">{props.label}</label>
        <input {...props} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary sm:text-sm" />
    </div>
);

const TextAreaField = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {label: string}) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">{props.label}</label>
        <textarea {...props} rows={3} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary sm:text-sm" />
    </div>
);

export default AddFeedbackRequestModal;
