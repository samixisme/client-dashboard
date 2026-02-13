
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Textarea } from '../ui/textarea';

interface DataSource {
    name: string;
    data: unknown;
    onSave: (newData: unknown) => void;
}

interface RawJsonEditorProps {
    source: DataSource;
}

const RawJsonEditor: React.FC<RawJsonEditorProps> = ({ source }) => {
    const [content, setContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setContent(JSON.stringify(source.data, null, 2));
    }, [source]);

    const handleSave = () => {
        try {
            const newData = JSON.parse(content);
            source.onSave(newData);
            setError(null);
            setIsSaved(true);
            toast.success('Changes saved');
            setTimeout(() => setIsSaved(false), 2000);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            setError(`Invalid JSON: ${errorMessage}`);
            toast.error(`Invalid JSON: ${errorMessage}`);
            setIsSaved(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-xl font-semibold text-text-primary mb-4">{source.name} (Raw)</h3>
            <Textarea
                emoji={false}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 p-4 font-mono bg-black/50"
                spellCheck={false}
            />
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleSave}
                    className={`px-6 py-2 text-sm font-bold rounded-lg transition-colors ${isSaved ? 'bg-green-500 text-white' : 'bg-primary text-background hover:bg-primary-hover'}`}
                >
                    {isSaved ? 'Saved!' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}

export default RawJsonEditor;
