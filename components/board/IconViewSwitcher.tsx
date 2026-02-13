import React from 'react';

export interface ViewOption {
    id: string;
    name: string;
    Icon: React.FC<{ className?: string }>;
}

interface IconViewSwitcherProps {
    currentView: string;
    onSwitchView: (view: string) => void;
    options: ViewOption[];
    orientation?: 'vertical' | 'horizontal';
}

const IconViewSwitcher: React.FC<IconViewSwitcherProps> = ({
    currentView,
    onSwitchView,
    options,
    orientation = 'vertical'
}) => {
    const containerClass = orientation === 'vertical'
        ? 'flex flex-col gap-3'
        : 'flex flex-row gap-3';

    return (
        <div className={containerClass}>
            {options.map(option => {
                const isActive = currentView === option.id;

                return (
                    <button
                        key={option.id}
                        onClick={() => onSwitchView(option.id)}
                        aria-label={`Switch to ${option.name} view`}
                        title={option.name}
                        className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                            isActive
                                ? 'bg-primary text-background shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] scale-105'
                                : 'bg-glass/60 backdrop-blur-xl text-text-secondary border border-border-color hover:bg-glass hover:text-primary hover:scale-105 hover:shadow-xl'
                        }`}
                    >
                        <option.Icon className="h-5 w-5" />
                    </button>
                );
            })}
        </div>
    );
};

export default IconViewSwitcher;
