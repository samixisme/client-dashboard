import React, { useState, useEffect } from 'react';

export interface BrandSortState {
    sortBy: 'createdAt' | 'name';
    sortDirection: 'asc' | 'desc';
}

interface BrandFilterSortPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    anchorEl: HTMLElement | null;
    initialState: BrandSortState;
    onApply: (state: BrandSortState) => void;
}

const BrandFilterSortPopover: React.FC<BrandFilterSortPopoverProps> = ({ isOpen, onClose, anchorEl, initialState, onApply }) => {
    const [localState, setLocalState] = useState<BrandSortState>(initialState);

    useEffect(() => {
        setLocalState(initialState);
    }, [initialState, isOpen]);
    
    if (!isOpen) return null;
    
    const handleApply = () => {
        onApply(localState);
        onClose();
    };

    return (
        <div className="absolute top-full right-0 mt-2 w-80 bg-glass/90 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-border-color/50 z-10 p-6 animate-fade-in-scale">
            <style>{`
                @keyframes fade-in-scale {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .animate-fade-in-scale {
                    animation: fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            {/* Sort By */}
            <div className="mb-5">
                <h4 className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wide">Sort By</h4>
                <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-glass-light transition-all duration-200 cursor-pointer group">
                        <input
                            type="radio"
                            name="sortBy"
                            value="createdAt"
                            checked={localState.sortBy === 'createdAt'}
                            onChange={(e) => setLocalState({ ...localState, sortBy: e.target.value as 'createdAt' | 'name' })}
                            className="h-4 w-4 text-primary bg-glass-light border-border-color focus:ring-2 focus:ring-primary cursor-pointer"
                        />
                        <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors duration-200">Creation Date</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-glass-light transition-all duration-200 cursor-pointer group">
                        <input
                            type="radio"
                            name="sortBy"
                            value="name"
                            checked={localState.sortBy === 'name'}
                            onChange={(e) => setLocalState({ ...localState, sortBy: e.target.value as 'createdAt' | 'name' })}
                            className="h-4 w-4 text-primary bg-glass-light border-border-color focus:ring-2 focus:ring-primary cursor-pointer"
                        />
                        <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors duration-200">Name</span>
                    </label>
                </div>
            </div>

            {/* Sort Direction */}
            <div className="mb-6">
                <h4 className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wide">Direction</h4>
                <div className="flex bg-glass-light/60 backdrop-blur-sm p-1.5 rounded-xl border border-border-color shadow-inner">
                    <button
                        onClick={() => setLocalState({ ...localState, sortDirection: 'asc' })}
                        className={`flex-1 text-center text-sm py-2.5 rounded-lg font-semibold transition-all duration-300 ${localState.sortDirection === 'asc' ? 'bg-primary text-background shadow-lg scale-105' : 'text-text-secondary hover:text-text-primary hover:bg-glass'}`}
                    >
                        Ascending
                    </button>
                    <button
                        onClick={() => setLocalState({ ...localState, sortDirection: 'desc' })}
                        className={`flex-1 text-center text-sm py-2.5 rounded-lg font-semibold transition-all duration-300 ${localState.sortDirection === 'desc' ? 'bg-primary text-background shadow-lg scale-105' : 'text-text-secondary hover:text-text-primary hover:bg-glass'}`}
                    >
                        Descending
                    </button>
                </div>
            </div>

            {/* Apply Button */}
            <button
                onClick={handleApply}
                className="w-full px-5 py-3 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-105 transition-all duration-300 shadow-lg relative overflow-hidden group"
            >
                <span className="relative z-10">Apply Filters</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
        </div>
    );
};

export default BrandFilterSortPopover;