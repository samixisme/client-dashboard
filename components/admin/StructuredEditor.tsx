
import React, { useState, useEffect, useMemo } from 'react';
import EditableItem from './EditableItem';
import { toast } from 'sonner';

interface DataSource {
    name: string;
    data: any[];
    onSave: (newData: any[]) => void;
}

const StructuredEditor: React.FC<{ source: DataSource }> = ({ source }) => {
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        // Deep copy to prevent mutation of original data store
        setItems(JSON.parse(JSON.stringify(source.data)));
    }, [source.data]);

    const isDirty = useMemo(() => JSON.stringify(items) !== JSON.stringify(source.data), [items, source.data]);

    const handleUpdateItem = (index: number, updatedItem: any) => {
        const newItems = [...items];
        newItems[index] = updatedItem;
        setItems(newItems);
    };

    const handleDeleteItem = (index: number) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            setItems(items.filter((_, i) => i !== index));
            toast.success('Item deleted');
        }
    };

    // FIX: The reduce function's initial value was an empty object which caused a type error.
    // By providing an initial accumulator with an `id` property, we satisfy the type requirements
    // and also fix a logic bug where a new item might not have an `id`.
    const handleAddItem = () => {
        const firstItem = items[0];
        let newItem;
        if (firstItem && typeof firstItem === 'object') {
            newItem = Object.keys(firstItem).reduce((acc, key) => {
                if (key === 'id') {
                    // The id is already set in the accumulator's initial value.
                    return acc;
                }
                const value = firstItem[key];
                if (typeof value === 'string') {
                    (acc as any)[key] = '';
                } else if (typeof value === 'number') {
                    (acc as any)[key] = 0;
                } else if (typeof value === 'boolean') {
                    (acc as any)[key] = false;
                } else if (Array.isArray(value)) {
                    (acc as any)[key] = [];
                } else {
                    (acc as any)[key] = null;
                }
                return acc;
            }, { id: `new-${Date.now()}` });
        } else {
            newItem = { id: `new-${Date.now()}` };
        }
        setItems([...items, newItem]);
        toast.success('Item added');
    };

    const handleSave = () => {
        source.onSave(items);
        toast.success('Changes saved');
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-glass py-2 z-10 -mt-6 -mx-6 px-6 pt-6">
                <h3 className="text-xl font-semibold text-text-primary">{source.name}</h3>
                <div className="flex items-center gap-4">
                    {isDirty && <span className="text-yellow-400 text-sm font-medium">Changes to save</span>}
                    <button onClick={handleAddItem} className="px-4 py-2 text-sm font-bold rounded-lg bg-glass-light text-text-primary hover:bg-border-color">Add New Item</button>
                    <button onClick={handleSave} disabled={!isDirty} className="px-6 py-2 text-sm font-bold rounded-lg bg-primary text-background hover:bg-primary-hover disabled:bg-gray-500 disabled:cursor-not-allowed">
                        Save Changes
                    </button>
                </div>
            </div>
            <div className="space-y-4">
                {items.map((item, index) => (
                    <EditableItem
                        key={item.id || index}
                        itemData={item}
                        onUpdate={(updatedItem) => handleUpdateItem(index, updatedItem)}
                        onDelete={() => handleDeleteItem(index)}
                    />
                ))}
            </div>
        </div>
    );
};

export default StructuredEditor;
