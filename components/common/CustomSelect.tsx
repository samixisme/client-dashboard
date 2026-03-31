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
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
      // Reset active index when opening to the currently selected item or the first item
      const currentIndex = options.findIndex(opt => opt.value === value);
      setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setActiveIndex(-1);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, options, value]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listboxRef.current) {
      const activeElement = listboxRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          if (activeIndex >= 0 && activeIndex < options.length) {
            handleSelect(options[activeIndex].value);
          }
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setActiveIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          buttonRef.current?.focus();
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
        }
        break;
      default:
        // Basic type-ahead search
        if (isOpen && e.key.length === 1) {
          const char = e.key.toLowerCase();
          const nextIndex = options.findIndex((opt, idx) =>
             idx > activeIndex && opt.label.toLowerCase().startsWith(char)
          );
          if (nextIndex >= 0) {
            setActiveIndex(nextIndex);
          } else {
            const firstIndex = options.findIndex(opt => opt.label.toLowerCase().startsWith(char));
            if (firstIndex >= 0) {
              setActiveIndex(firstIndex);
            }
          }
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Select Button */}
      <button
        ref={buttonRef}
        role="combobox"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'custom-select-listbox' : undefined}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `custom-select-option-${activeIndex}` : undefined}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
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
          <div
            id="custom-select-listbox"
            role="listbox"
            ref={listboxRef}
            className="max-h-60 overflow-y-auto custom-scrollbar py-1"
            tabIndex={-1}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <button
                  key={option.value}
                  id={`custom-select-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onClick={(e) => {
                     e.preventDefault(); // Prevents button from stealing focus from the select button
                     handleSelect(option.value);
                  }}
                  className={`
                    w-full px-4 py-3 text-left text-sm font-medium
                    transition-all duration-200
                    ${isSelected
                      ? 'bg-primary/25 text-primary font-bold border-l-4 border-primary shadow-[inset_0_0_20px_rgba(163,230,53,0.25)]'
                      : 'text-text-primary hover:bg-primary/15 hover:text-primary hover:border-l-4 hover:border-primary/50 hover:font-semibold'
                    }
                    ${isActive && !isSelected ? 'bg-primary/15 text-primary border-l-4 border-primary/50 font-semibold' : ''}
                  `}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
