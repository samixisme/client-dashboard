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
        <div ref={wrapperRef} className="relative">
            <button onClick={() => setIsOpen(o => !o)} className="px-3 py-2 flex items-center gap-2 bg-glass text-text-primary text-sm font-medium rounded-lg border border-border-color hover:bg-glass-light">
                <activeView.Icon className="h-5 w-5"/> {activeView.name} <ChevronDownIcon className={`h-4 w-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            {isOpen && (
                <div className={`absolute top-full right-0 mt-2 ${widthClass} bg-glass rounded-xl shadow-lg border border-border-color z-10 p-2`}>
                    {options.map(option => (
                        <button 
                            key={option.id} 
                            onClick={() => handleSelect(option.id)}
                            className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md ${
                                currentView === option.id 
                                    ? 'bg-primary text-background font-bold' 
                                    : 'text-text-primary hover:bg-glass-light'
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