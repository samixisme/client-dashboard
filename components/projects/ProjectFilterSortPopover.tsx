import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { ProjectStatus } from '../../types';

export interface FilterSortState {
    status: ProjectStatus | 'All';
    brands: string[];
    sortBy: 'createdAt' | 'name';
    sortDirection: 'asc' | 'desc';
}

interface ProjectFilterSortPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    anchorEl: HTMLElement | null;
    initialState: FilterSortState;
    onApply: (state: FilterSortState) => void;
}

const ProjectFilterSortPopover: React.FC<ProjectFilterSortPopoverProps> = ({ isOpen, onClose, anchorEl, initialState, onApply }) => {
    const { data } = useData();
    const [localState, setLocalState] = useState<FilterSortState>(initialState);

    useEffect(() => {
        setLocalState(initialState);
    }, [initialState, isOpen]);
    
    if (!isOpen) return null;

    const handleBrandToggle = (brandId: string) => {
        setLocalState(prev => {
            const newBrands = prev.brands.includes(brandId)
                ? prev.brands.filter(id => id !== brandId)
                : [...prev.brands, brandId];
            return { ...prev, brands: newBrands };
        });
    };
    
    const handleApply = () => {
        onApply(localState);
        onClose();
    };

    return (
        <div className="absolute top-full right-0 mt-2 w-72 bg-glass rounded-xl shadow-lg border border-border-color z-10 p-4">
            {/* Status Filter */}
            <div className="mb-4">
                <h4 className="text-sm font-semibold text-text-primary mb-2">Filter</h4>
                <select
                    value={localState.status}
                    onChange={(e) => setLocalState({ ...localState, status: e.target.value as FilterSortState['status'] })}
                    className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary text-sm"
                >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                </select>
            </div>
            
             {/* Brand Filter */}
            <div className="mb-4">
                <h4 className="text-sm font-semibold text-text-primary mb-2">By Brand</h4>
                <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                   {data.brands.map(brand => (
                        <label key={brand.id} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                            <input type="checkbox" checked={localState.brands.includes(brand.id)} onChange={() => handleBrandToggle(brand.id)} className="h-4 w-4 rounded bg-glass-light border-border-color text-primary focus:ring-primary"/>
                            {brand.name}
                        </label>
                   ))}
                </div>
            </div>

            {/* Sort By */}
            <div className="mb-4 pt-4 border-t border-border-color">
                <h4 className="text-sm font-semibold text-text-primary mb-2">Sort By</h4>
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                        <input type="radio" name="sortBy" value="createdAt" checked={localState.sortBy === 'createdAt'} onChange={(e) => setLocalState({ ...localState, sortBy: e.target.value as 'createdAt' | 'name' })} className="h-4 w-4 text-primary bg-glass-light border-border-color focus:ring-primary"/>
                        Created Date
                    </label>
                     <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                        <input type="radio" name="sortBy" value="name" checked={localState.sortBy === 'name'} onChange={(e) => setLocalState({ ...localState, sortBy: e.target.value as 'createdAt' | 'name' })} className="h-4 w-4 text-primary bg-glass-light border-border-color focus:ring-primary"/>
                        Title
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

export default ProjectFilterSortPopover;
