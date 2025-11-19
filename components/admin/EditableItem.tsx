
import React, { useState } from 'react';
import FormField from './FormField';

interface EditableItemProps {
    itemData: any;
    onUpdate: (updatedItem: any) => void;
    onDelete: () => void;
}

const EditableItem: React.FC<EditableItemProps> = ({ itemData, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedItem, setEditedItem] = useState(itemData);

    const handleFieldUpdate = (key: string, value: any) => {
        setEditedItem((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onUpdate(editedItem);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedItem(itemData);
        setIsEditing(false);
    };

    const title = itemData.name || itemData.title || itemData.id || 'Item';

    if (!isEditing) {
        return (
            <div className="bg-glass-light p-3 rounded-lg border border-border-color flex justify-between items-center">
                <p className="text-text-primary font-medium truncate">{title}</p>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditing(true)} className="px-3 py-1 text-xs font-semibold rounded-md bg-glass text-text-primary hover:bg-border-color">Edit</button>
                    <button onClick={onDelete} className="px-3 py-1 text-xs font-semibold rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/40">Delete</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-glass-light p-4 rounded-lg border-2 border-primary">
            <div className="space-y-4">
                {Object.entries(editedItem).map(([key, value]) => (
                    <FormField
                        key={key}
                        fieldKey={key}
                        fieldValue={value}
                        onUpdate={handleFieldUpdate}
                        path={key}
                    />
                ))}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-color">
                <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium rounded-md bg-glass text-text-primary hover:bg-border-color">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-bold rounded-md bg-primary text-background hover:bg-primary-hover">Save</button>
            </div>
        </div>
    );
};

export default EditableItem;
