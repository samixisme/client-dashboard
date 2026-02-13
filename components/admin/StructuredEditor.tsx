
import React, { useState, useEffect, useMemo } from 'react';
import EditableItem from './EditableItem';
import { toast } from 'sonner';

export interface DataSource<T = Record<string, unknown>> {
    name: string;
    data: T[];
    onSave: (newData: T[]) => void;
}

const StructuredEditor: React.FC<{ source: DataSource }> = ({ source }) => {
    const [items, setItems] = useState<typeof source.data>([]);

    useEffect(() => {
        // Deep copy to prevent mutation of original data store
        setItems(JSON.parse(JSON.stringify(source.data)));
    }, [source.data]);

    const isDirty = useMemo(() => JSON.stringify(items) !== JSON.stringify(source.data), [items, source.data]);

    const handleUpdateItem = (index: number, updatedItem: typeof items[0]) => {
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
        let newItem: Record<string, unknown>;
        if (firstItem && typeof firstItem === 'object') {
            newItem = Object.keys(firstItem).reduce((acc, key) => {
                if (key === 'id') {
                    // The id is already set in the accumulator's initial value.
                    return acc;
                }
                const value = (firstItem as Record<string, unknown>)[key];
                if (typeof value === 'string') {
                    acc[key] = '';
                } else if (typeof value === 'number') {
                    acc[key] = 0;
                } else if (typeof value === 'boolean') {
                    acc[key] = false;
                } else if (Array.isArray(value)) {
                    acc[key] = [];
                } else {
                    acc[key] = null;
                }
                return acc;
            }, { id: `new-${Date.now()}` } as Record<string, unknown>);
        } else {
            newItem = { id: `new-${Date.now()}` };
        }
        setItems([...items, newItem as typeof items[0]]);
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
                        key={(item.id as string) || String(index)}
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
