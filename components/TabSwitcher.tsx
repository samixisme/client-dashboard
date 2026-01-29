import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

interface TabSwitcherProps {
  options: { key: string; label: string }[];
  activeOption: string;
  onOptionClick: (option: string) => void;
}

const TabSwitcher: React.FC<TabSwitcherProps> = ({ options, activeOption, onOptionClick }) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    buttonsRef.current = buttonsRef.current.slice(0, options.length);
  }, [options]);

  useEffect(() => {
    const activeIndex = options.findIndex(opt => opt.key === activeOption);
    const activeButton = buttonsRef.current[activeIndex];
    const container = containerRef.current;

    if (activeButton && sliderRef.current && container) {
      const updateSlider = () => {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        
        // Get border width to correct relative position (assuming 1px border from Tailwind border class)
        // We can compute it to be safe
        const computedStyle = window.getComputedStyle(container);
        const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;

        // Calculate relative position within the content box (inside border)
        // but 'absolute' with default is inside padding box?
        // Actually 'absolute' is relative to padding box of positioned ancestor.
        // If we set 'x', it transforms from that origin (top-left of padding box).
        
        // Distance from window-left of button minus window-left of container gives distance from container outer edge.
        // Subtract borderLeft to get distance from padding edge.
        const x = buttonRect.left - containerRect.left - borderLeft;
        const width = buttonRect.width;

        gsap.to(sliderRef.current, {
          width: width,
          x: x,
          duration: 0.3,
          ease: 'power3.inOut',
        });
      };

      // Run logic
      updateSlider();
      
      // Handle resize to keep it synced
      window.addEventListener('resize', updateSlider);
      return () => window.removeEventListener('resize', updateSlider);
    }
  }, [activeOption, options]);

  return (
    <div ref={containerRef} className="relative flex p-1 bg-white/5 backdrop-blur-sm border border-[rgba(163,230,53,0.2)] rounded-lg select-none shadow-lg">
      <div ref={sliderRef} className="absolute top-1 bottom-1 h-auto bg-[#A3E635] rounded-lg shadow-lg shadow-[#A3E635]/30" />
      {options.map((option, index) => (
        <button
          key={option.key}
          ref={el => { buttonsRef.current[index] = el; }}
          onClick={() => onOptionClick(option.key)}
          type="button"
          className={`relative z-10 flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors duration-300 whitespace-nowrap flex justify-center items-center
            ${activeOption === option.key ? 'text-black' : 'text-text-secondary hover:text-text-primary'}`
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default TabSwitcher;
