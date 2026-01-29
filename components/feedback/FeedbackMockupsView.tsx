import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { FeedbackMockup, MockupImage } from '../../types';
import { AddIcon } from '../icons/AddIcon';

const FeedbackMockupsView = ({ projectId }: { projectId: string }) => {
    const { data, forceUpdate } = useData();
    const mockups = data.feedbackMockups.filter(m => m.projectId === projectId);
    
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newUrls, setNewUrls] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim() && newUrls.trim()) {
            const images: MockupImage[] = newUrls.split(',').map((url, index) => ({
                id: `img-${Date.now()}-${index}`,
                name: `image-${index+1}.jpg`,
                url: url.trim(),
            }));
            const newMockup: FeedbackMockup = {
                id: `mock-${Date.now()}`,
                projectId,
                name: newName,
                images: images,
            };
            data.feedbackMockups.push(newMockup);
            forceUpdate();
            setIsAdding(false);
            setNewName('');
            setNewUrls('');
        }
    };
    
    return (
        <div>
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setIsAdding(true)}
                    className="px-6 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group flex items-center gap-2"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <AddIcon className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300"/>
                        Add Mockup
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-glass/60 backdrop-blur-xl p-6 rounded-2xl border border-primary/30 mb-6 space-y-4 shadow-xl animate-scale-in">
                    <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Mockup Name"
                        className="w-full bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all duration-300"
                        required
                    />
                    <textarea
                        value={newUrls}
                        onChange={e => setNewUrls(e.target.value)}
                        placeholder="Image URLs, separated by commas"
                        className="w-full bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all duration-300 resize-none"
                        rows={3}
                        required
                    />
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2 bg-glass-light/60 backdrop-blur-sm text-text-primary text-sm font-medium rounded-xl hover:bg-border-color hover:scale-105 transition-all duration-300 border border-border-color"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:scale-105 hover:shadow-lg transition-all duration-300 shadow-md"
                        >
                            Save
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-glass/40 backdrop-blur-xl rounded-2xl border border-border-color overflow-hidden shadow-xl">
                <ul className="divide-y divide-border-color/30">
                    {mockups.map((mockup, index) => {
                        const total = mockup.images.length;
                        const approved = mockup.approvedImageIds?.length || 0;
                        const percent = total > 0 ? Math.round((approved / total) * 100) : 0;
                        return (
                             <li
                                key={mockup.id}
                                className="p-5 flex items-center justify-between hover:bg-glass-light/60 hover:shadow-lg transition-all duration-300 group"
                                style={{ animationDelay: `${index * 30}ms` }}
                            >
                                <div>
                                    <p className="font-bold text-text-primary group-hover:text-primary transition-colors duration-300 text-lg">{mockup.name}</p>
                                    <p className="text-sm text-text-secondary/90 mt-1">{total} image(s)</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="px-3 py-2 rounded-xl bg-glass-light/60 backdrop-blur-sm border border-border-color/50 text-center">
                                            <p className="font-bold text-green-400 text-lg">{approved}</p>
                                            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Approved</p>
                                        </div>
                                        <div className="px-3 py-2 rounded-xl bg-glass-light/60 backdrop-blur-sm border border-border-color/50 text-center">
                                            <p className="font-bold text-text-primary text-lg">{total}</p>
                                            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Total</p>
                                        </div>
                                        <div className="px-3 py-2 rounded-xl bg-primary/15 backdrop-blur-sm border border-primary/30 text-center">
                                            <p className="font-bold text-primary text-lg">{percent}%</p>
                                            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Complete</p>
                                        </div>
                                    </div>
                                    <Link
                                        to={`/feedback/${projectId}/mockups/${mockup.id}`}
                                        className="px-5 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:scale-110 hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] transition-all duration-300 shadow-md"
                                    >
                                        View
                                    </Link>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    );
};

export default FeedbackMockupsView;