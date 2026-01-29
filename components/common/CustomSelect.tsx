import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3
          border border-border-color
          bg-glass-light backdrop-blur-xl
          text-text-primary text-left
          rounded-xl
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          transition-all duration-300
          font-medium shadow-sm
          flex items-center justify-between
          ${!disabled && 'hover:border-primary/50 hover:shadow-[0_0_15px_rgba(163,230,53,0.15)] hover:bg-glass-light/80'}
          ${disabled && 'opacity-50 cursor-not-allowed'}
          ${isOpen && 'border-primary shadow-[0_0_20px_rgba(163,230,53,0.3)] bg-glass-light/90'}
        `}
      >
        <span className={selectedOption ? 'text-text-primary' : 'text-text-secondary'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-5 h-5 text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface/98 backdrop-blur-2xl border border-primary/50 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(163,230,53,0.2)] overflow-hidden animate-scale-in">
          <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full px-4 py-3 text-left text-sm font-medium
                  transition-all duration-200
                  ${option.value === value
                    ? 'bg-primary/25 text-primary font-bold border-l-4 border-primary shadow-[inset_0_0_20px_rgba(163,230,53,0.25)]'
                    : 'text-text-primary hover:bg-primary/15 hover:text-primary hover:border-l-4 hover:border-primary/50 hover:font-semibold'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
