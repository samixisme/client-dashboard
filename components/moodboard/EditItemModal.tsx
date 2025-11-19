import React, { useState, useEffect } from 'react';
import { MoodboardItem } from '../../types';

interface EditItemModalProps {
    item: MoodboardItem;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedItem: MoodboardItem) => void;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, isOpen, onClose, onSave }) => {
    const [editedContent, setEditedContent] = useState(item.content);

    useEffect(() => {
        setEditedContent(item.content);
    }, [item]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ ...item, content: editedContent });
    };

    const renderFields = () => {
        switch (item.type) {
            case 'text':
                return (
                    <TextAreaField
                        label="Text Content"
                        value={editedContent.text || ''}
                        onChange={(e) => setEditedContent({ ...editedContent, text: e.target.value })}
                    />
                );
            case 'link':
                return (
                    <>
                        <InputField
                            label="URL"
                            value={editedContent.url || ''}
                            onChange={(e) => setEditedContent({ ...editedContent, url: e.target.value })}
                        />
                         <InputField
                            label="Display Text (Optional)"
                            value={editedContent.text || ''}
                            onChange={(e) => setEditedContent({ ...editedContent, text: e.target.value })}
                        />
                    </>
                );
            case 'image':
                 return (
                    <InputField
                        label="Image URL"
                        value={editedContent.imageUrl || ''}
                        onChange={(e) => setEditedContent({ ...editedContent, imageUrl: e.target.value })}
                    />
                );
            case 'color':
                return (
                    <>
                         <InputField
                            label="Color Name (Optional)"
                            value={editedContent.text || ''}
                            onChange={(e) => setEditedContent({ ...editedContent, text: e.target.value })}
                        />
                        <div className="flex items-center gap-2">
                            <input 
                                type="color" 
                                value={editedContent.hex || '#000000'} 
                                onChange={(e) => setEditedContent({ ...editedContent, hex: e.target.value })}
                                className="p-0 h-10 w-10 block bg-transparent border-none cursor-pointer rounded-lg overflow-hidden"
                            />
                            <InputField
                                label="Hex Code"
                                value={editedContent.hex || ''}
                                onChange={(e) => setEditedContent({ ...editedContent, hex: e.target.value })}
                            />
                        </div>
                    </>
                );
            case 'column':
                return (
                    <InputField
                        label="Column Title"
                        value={editedContent.title || ''}
                        onChange={(e) => setEditedContent({ ...editedContent, title: e.target.value })}
                    />
                );
            default:
                return <p className="text-text-secondary">This item type cannot be edited.</p>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-glass w-full max-w-lg rounded-2xl shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-6">Edit {item.type.charAt(0).toUpperCase() + item.type.slice(1)}</h2>
                <div className="space-y-4">
                    {renderFields()}
                </div>
                <div className="flex justify-end gap-4 mt-8">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Save</button>
                </div>
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
        <textarea {...props} rows={4} className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary sm:text-sm" />
    </div>
);

export default EditItemModal;
