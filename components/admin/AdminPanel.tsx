
import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import StructuredEditor from './StructuredEditor';
import RawJsonEditor from './RawJsonEditor';

interface DataSource {
    name: string;
    data: any;
    onSave: (newData: any) => void;
}

interface AdminPanelProps {
    dataSources: DataSource[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({ dataSources }) => {
    const { toggleAdminMode } = useAdmin();
    const [activeSourceIndex, setActiveSourceIndex] = useState(0);
    const [editorMode, setEditorMode] = useState<'structured' | 'raw'>('structured');

    const activeSource = dataSources[activeSourceIndex];
    
    // Structured editor works best with an array of objects.
    const isStructuredFriendly = Array.isArray(activeSource?.data) && activeSource.data.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));

    // Default to raw editor if data is not structured-friendly
    React.useEffect(() => {
        if (!isStructuredFriendly) {
            setEditorMode('raw');
        } else {
            setEditorMode('structured');
        }
    }, [activeSourceIndex, isStructuredFriendly]);


    if (dataSources.length === 0) {
        return (
             <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-glass p-8 rounded-lg max-w-lg w-full">
                    <h2 className="text-2xl font-bold text-text-primary mb-4">Admin Panel</h2>
                    <p className="text-text-secondary">No editable data sources have been configured for this page.</p>
                     <button onClick={toggleAdminMode} className="mt-6 px-4 py-2 bg-primary text-background font-bold rounded-lg">Exit Admin Mode</button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-background/95 z-50 p-4 lg:p-10 flex flex-col no-print">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-3xl font-bold text-text-primary">Admin Backend</h2>
                <button onClick={toggleAdminMode} className="text-4xl text-text-secondary hover:text-text-primary">&times;</button>
            </div>
            <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                <div className="w-full md:w-64 flex-shrink-0 bg-glass p-4 rounded-lg border border-border-color overflow-y-auto">
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Data Sources</h3>
                    <nav className="flex flex-col gap-1">
                        {dataSources.map((source, index) => (
                            <button
                                key={source.name}
                                onClick={() => setActiveSourceIndex(index)}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeSourceIndex === index ? 'bg-primary text-background font-semibold' : 'text-text-secondary hover:bg-glass-light'}`}
                            >
                                {source.name}
                            </button>
                        ))}
                    </nav>
                </div>
                <main className="flex-1 bg-glass p-6 rounded-lg border border-border-color overflow-hidden flex flex-col">
                    <div className="flex items-center gap-2 border-b border-border-color mb-4 flex-shrink-0">
                        <button onClick={() => setEditorMode('structured')} disabled={!isStructuredFriendly} className={`py-2 px-4 text-sm font-medium ${editorMode === 'structured' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                            Structured Editor
                        </button>
                        <button onClick={() => setEditorMode('raw')} className={`py-2 px-4 text-sm font-medium ${editorMode === 'raw' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                            Raw JSON
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {activeSource && editorMode === 'structured' && isStructuredFriendly && (
                            <StructuredEditor key={activeSource.name} source={activeSource} />
                        )}
                        {activeSource && editorMode === 'raw' && (
                            <RawJsonEditor key={activeSource.name} source={activeSource} />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminPanel;
