import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

export interface ViewOption {
    id: string;
    name: string;
    Icon: React.FC<any>;
}

interface ViewSwitcherProps {
    currentView: string;
    onSwitchView: (view: string) => void;
    options: ViewOption[];
    widthClass?: string;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onSwitchView, options, widthClass = 'w-48' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const activeView = options.find(v => v.id === currentView) || options[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (view: string) => {
        onSwitchView(view);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative z-50">
            <button onClick={() => setIsOpen(o => !o)} className="px-4 py-2.5 flex items-center gap-2.5 bg-glass/60 backdrop-blur-xl text-text-primary text-sm font-semibold rounded-xl border border-border-color hover:bg-glass hover:shadow-xl hover:scale-105 hover:border-primary/40 transition-all duration-300 shadow-md">
                <activeView.Icon className="h-5 w-5"/> {activeView.name} <ChevronDownIcon className={`h-4 w-4 text-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            {isOpen && (
                <div className={`absolute top-full right-0 mt-2 ${widthClass} bg-glass/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border-color z-[9999] p-2 animate-scale-in`}>
                    {options.map(option => (
                        <button
                            key={option.id}
                            onClick={() => handleSelect(option.id)}
                            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-300 ${
                                currentView === option.id
                                    ? 'bg-primary text-background font-bold shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] scale-105'
                                    : 'text-text-primary hover:bg-glass-light/60 hover:scale-105'
                            }`}
                        >
                            <option.Icon className="h-5 w-5" />
                            <span>{option.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ViewSwitcher;