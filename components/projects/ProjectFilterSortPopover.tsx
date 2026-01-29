import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../contexts/DataContext';
import { ProjectStatus } from '../../types';
import CustomSelect from '../common/CustomSelect';

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
    const popoverRef = React.useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, right: 0 });
    const [expandedSections, setExpandedSections] = useState({ brands: false, sort: false });

    useEffect(() => {
        setLocalState(initialState);
    }, [initialState, isOpen]);

    // Update position when anchorEl changes
    useEffect(() => {
        if (isOpen && anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 8,
                right: window.innerWidth - rect.right,
            });
        }
    }, [isOpen, anchorEl]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
                anchorEl && !anchorEl.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, anchorEl]);

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

    const popoverContent = (
        <div
            ref={popoverRef}
            className="fixed bg-glass/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-border-color p-4 w-80 animate-scale-in"
            style={{
                top: `${position.top}px`,
                right: `${position.right}px`,
                zIndex: 9999,
            }}
        >
            {/* Status Filter */}
            <div className="mb-3">
                <h4 className="text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">Status</h4>
                <CustomSelect
                    value={localState.status}
                    onChange={(value) => setLocalState({ ...localState, status: value as FilterSortState['status'] })}
                    options={[
                        { value: 'All', label: 'All Statuses' },
                        { value: 'Active', label: 'Active' },
                        { value: 'Completed', label: 'Completed' },
                        { value: 'Archived', label: 'Archived' },
                    ]}
                />
            </div>

            {/* Brand Filter - Collapsible */}
            <div className="mb-3 border-t border-border-color/30 pt-3">
                <button
                    onClick={() => setExpandedSections({ ...expandedSections, brands: !expandedSections.brands })}
                    className="w-full flex items-center justify-between text-xs font-bold text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors duration-200 mb-2"
                >
                    <span className="flex items-center gap-2">
                        Brands
                        {localState.brands.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-primary/20 text-primary rounded text-xs font-bold">{localState.brands.length}</span>
                        )}
                    </span>
                    <svg className={`w-4 h-4 transition-transform duration-200 ${expandedSections.brands ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
                {expandedSections.brands && (
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {data.brands.map(brand => (
                            <label key={brand.id} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer p-1.5 rounded-lg hover:bg-glass-light/40 transition-all duration-200 group">
                                <input
                                    type="checkbox"
                                    checked={localState.brands.includes(brand.id)}
                                    onChange={() => handleBrandToggle(brand.id)}
                                    className="h-3.5 w-3.5 rounded-md border-border-color checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/50 transition-all duration-200 cursor-pointer accent-primary"
                                />
                                <span className="text-xs font-medium group-hover:text-primary transition-colors duration-200">{brand.name}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Sort By - Collapsible */}
            <div className="mb-3 border-t border-border-color/30 pt-3">
                <button
                    onClick={() => setExpandedSections({ ...expandedSections, sort: !expandedSections.sort })}
                    className="w-full flex items-center justify-between text-xs font-bold text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors duration-200 mb-2"
                >
                    <span>Sort By</span>
                    <svg className={`w-4 h-4 transition-transform duration-200 ${expandedSections.sort ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
                {expandedSections.sort && (
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer p-1.5 rounded-lg hover:bg-glass-light/40 transition-all duration-200 group">
                            <input
                                type="radio"
                                name="sortBy"
                                value="createdAt"
                                checked={localState.sortBy === 'createdAt'}
                                onChange={(e) => setLocalState({ ...localState, sortBy: e.target.value as 'createdAt' | 'name' })}
                                className="h-3.5 w-3.5 border-border-color checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/50 cursor-pointer accent-primary"
                            />
                            <span className="text-xs font-medium group-hover:text-primary transition-colors duration-200">Created Date</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer p-1.5 rounded-lg hover:bg-glass-light/40 transition-all duration-200 group">
                            <input
                                type="radio"
                                name="sortBy"
                                value="name"
                                checked={localState.sortBy === 'name'}
                                onChange={(e) => setLocalState({ ...localState, sortBy: e.target.value as 'createdAt' | 'name' })}
                                className="h-3.5 w-3.5 border-border-color checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/50 cursor-pointer accent-primary"
                            />
                            <span className="text-xs font-medium group-hover:text-primary transition-colors duration-200">Title</span>
                        </label>
                    </div>
                )}
            </div>

            {/* Sort Direction */}
            <div className="flex bg-glass-light p-1 rounded-lg border border-border-color mb-3 gap-1">
                <button
                    onClick={() => setLocalState({ ...localState, sortDirection: 'asc' })}
                    className={`flex-1 text-center text-xs py-2 px-2 rounded-md font-bold transition-all duration-300 ${localState.sortDirection === 'asc' ? 'bg-primary text-background shadow-lg scale-105' : 'text-text-secondary hover:bg-glass hover:text-text-primary'}`}
                >
                    Asc
                </button>
                <button
                    onClick={() => setLocalState({ ...localState, sortDirection: 'desc' })}
                    className={`flex-1 text-center text-xs py-2 px-2 rounded-md font-bold transition-all duration-300 ${localState.sortDirection === 'desc' ? 'bg-primary text-background shadow-lg scale-105' : 'text-text-secondary hover:bg-glass hover:text-text-primary'}`}
                >
                    Desc
                </button>
            </div>

            {/* Apply Button */}
            <button
                onClick={handleApply}
                className="w-full px-4 py-2.5 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-105 transition-all duration-300 shadow-lg relative overflow-hidden group/btn"
            >
                <span className="relative z-10">Apply Filters</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
            </button>
        </div>
    );

    return createPortal(popoverContent, document.body);
};

export default ProjectFilterSortPopover;
