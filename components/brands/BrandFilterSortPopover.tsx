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
        <div className="absolute top-full right-0 mt-2 w-72 bg-glass rounded-xl shadow-lg border border-border-color z-10 p-4">
            {/* Sort By */}
            <div className="mb-4">
                <h4 className="text-sm font-semibold text-text-primary mb-2">Sort By</h4>
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                        <input type="radio" name="sortBy" value="createdAt" checked={localState.sortBy === 'createdAt'} onChange={(e) => setLocalState({ ...localState, sortBy: e.target.value as 'createdAt' | 'name' })} className="h-4 w-4 text-primary bg-glass-light border-border-color focus:ring-primary"/>
                        Creation Date
                    </label>
                     <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                        <input type="radio" name="sortBy" value="name" checked={localState.sortBy === 'name'} onChange={(e) => setLocalState({ ...localState, sortBy: e.target.value as 'createdAt' | 'name' })} className="h-4 w-4 text-primary bg-glass-light border-border-color focus:ring-primary"/>
                        Name
                    </label>
                </div>
            </div>
            
            {/* Sort Direction */}
            <div className="flex bg-glass-light p-1 rounded-lg border border-border-color mb-4">
                <button 
                    onClick={() => setLocalState({ ...localState, sortDirection: 'asc' })}
                    className={`flex-1 text-center text-sm py-1 rounded-md ${localState.sortDirection === 'asc' ? 'bg-surface text-text-primary font-semibold' : 'text-text-secondary'}`}
                >
                    Ascending
                </button>
                 <button 
                    onClick={() => setLocalState({ ...localState, sortDirection: 'desc' })}
                    className={`flex-1 text-center text-sm py-1 rounded-md ${localState.sortDirection === 'desc' ? 'bg-surface text-text-primary font-semibold' : 'text-text-secondary'}`}
                >
                    Descending
                </button>
            </div>
            
            {/* Apply Button */}
            <button onClick={handleApply} className="w-full px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">
                Apply
            </button>
        </div>
    );
};

export default BrandFilterSortPopover;