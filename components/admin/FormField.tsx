
import React from 'react';
// We need a forwardRef to handle the recursive nature of StructuredEditor
const StructuredEditor = React.lazy(() => import('./StructuredEditor'));

interface FormFieldProps {
    fieldKey: string;
    fieldValue: unknown;
    onUpdate: (key: string, value: unknown) => void;
    path: string; // e.g., "colors[0].name"
}

const FormField: React.FC<FormFieldProps> = ({ fieldKey, fieldValue, onUpdate, path }) => {
    const label = fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    
    // Recursive update handler for nested objects
    const handleNestedUpdate = (nestedKey: string, nestedValue: unknown) => {
        onUpdate(fieldKey, { ...fieldValue as Record<string, unknown>, [nestedKey]: nestedValue });
    };

    // Recursive update handler for nested arrays of objects
    const handleArrayUpdate = (newArray: any[]) => {
        onUpdate(fieldKey, newArray);
    };

    let inputElement;

    if (fieldKey === 'id' || fieldKey.endsWith('Id')) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <label htmlFor={path} className="text-sm font-medium text-text-secondary md:text-right">{label}</label>
                <div className="col-span-3">
                     <p className="text-sm text-text-secondary font-mono bg-glass p-2 rounded">{fieldValue}</p>
                </div>
            </div>
        );
    }

    if (typeof fieldValue === 'boolean') {
        inputElement = (
            <input
                type="checkbox"
                checked={fieldValue}
                onChange={(e) => onUpdate(fieldKey, e.target.checked)}
                className="h-5 w-5 rounded bg-glass-light border-border-color text-primary focus:ring-primary"
            />
        );
    } else if (typeof fieldValue === 'number') {
        inputElement = (
            <input
                type="number"
                id={path}
                value={fieldValue}
                onChange={(e) => onUpdate(fieldKey, parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border-color bg-glass placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
        );
    } else if (typeof fieldValue === 'string') {
        if ((fieldKey.toLowerCase().includes('color') || fieldKey.toLowerCase().includes('hex')) && /^#([0-9a-f]{3}){1,2}$/i.test(fieldValue)) {
            inputElement = (
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        id={path}
                        value={fieldValue}
                        onChange={(e) => onUpdate(fieldKey, e.target.value)}
                        className="p-0 h-10 w-10 block bg-transparent border-none cursor-pointer rounded-lg overflow-hidden"
                    />
                     <input
                        type="text"
                        value={fieldValue}
                        onChange={(e) => onUpdate(fieldKey, e.target.value)}
                        className="w-full px-3 py-2 border border-border-color bg-glass placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm font-mono"
                    />
                </div>
            );
        } else if (fieldValue.length > 100 || fieldValue.includes('\n')) {
            inputElement = (
                <textarea
                    id={path}
                    value={fieldValue}
                    rows={5}
                    onChange={(e) => onUpdate(fieldKey, e.target.value)}
                    className="w-full px-3 py-2 border border-border-color bg-glass placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
            );
        } else {
            inputElement = (
                <input
                    type="text"
                    id={path}
                    value={fieldValue}
                    onChange={(e) => onUpdate(fieldKey, e.target.value)}
                    className="w-full px-3 py-2 border border-border-color bg-glass placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
            );
        }
    } else if (Array.isArray(fieldValue)) {
        // If it's an array of objects, render a nested StructuredEditor
        if (fieldValue.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
            const nestedDataSource = {
                name: label,
                data: fieldValue,
                onSave: handleArrayUpdate
            };
            return (
                 <div className="p-4 border border-border-color rounded-lg bg-glass">
                     <React.Suspense fallback={<div>Loading Editor...</div>}>
                        <StructuredEditor source={nestedDataSource} />
                     </React.Suspense>
                 </div>
            );
        } else {
            // Otherwise, render a textarea for simple arrays (e.g., of strings)
             inputElement = (
                <textarea
                    id={path}
                    value={fieldValue.join(', ')}
                    rows={3}
                    onChange={(e) => onUpdate(fieldKey, e.target.value.split(',').map(s => s.trim()))}
                    className="w-full px-3 py-2 border border-border-color bg-glass placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
            );
        }
    } else if (typeof fieldValue === 'object' && fieldValue !== null) {
        return (
            <div className="p-4 border border-border-color rounded-lg bg-glass space-y-3">
                <h4 className="text-md font-semibold text-text-primary">{label}</h4>
                {Object.entries(fieldValue).map(([nestedKey, nestedValue]) => (
                    <FormField
                        key={nestedKey}
                        fieldKey={nestedKey}
                        fieldValue={nestedValue}
                        onUpdate={handleNestedUpdate}
                        path={`${path}.${nestedKey}`}
                    />
                ))}
            </div>
        );
    } else {
        inputElement = <p className="text-sm text-text-secondary">Unsupported data type</p>;
    }


    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <label htmlFor={path} className="text-sm font-medium text-text-secondary md:text-right pt-2">{label}</label>
            <div className="col-span-3">
                {inputElement}
            </div>
        </div>
    );
};

export default FormField;
