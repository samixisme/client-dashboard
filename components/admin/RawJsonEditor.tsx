
import React, { useState, useEffect } from 'react';

interface DataSource {
    name: string;
    data: any;
    onSave: (newData: any) => void;
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
            setTimeout(() => setIsSaved(false), 2000);
        } catch (e: any) {
            setError(`Invalid JSON: ${e.message}`);
            setIsSaved(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-xl font-semibold text-text-primary mb-4">{source.name} (Raw)</h3>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full flex-1 p-4 font-mono text-sm rounded-lg bg-black/50 border border-border-color focus:ring-primary focus:border-primary text-text-primary resize-none"
                spellCheck="false"
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
