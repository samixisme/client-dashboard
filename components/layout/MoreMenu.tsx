
import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  Icon: React.FC<{ className?: string }>;
  label: string;
}

interface MoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
}

const MoreMenu: React.FC<MoreMenuProps> = ({ isOpen, onClose, navItems }) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-end md:hidden" 
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-glass w-full rounded-t-2xl p-4 pb-6 border-t border-border-color" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-border-color rounded-full mx-auto mb-4"></div>
        <div className="grid grid-cols-4 gap-4">
          {navItems.map(({ to, Icon, label }) => (
            <NavLink 
              key={to} 
              to={to} 
              onClick={onClose}
            >
              {({ isActive }) => (
                <div className={`flex flex-col items-center justify-center text-xs p-1 h-full transition-colors ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                  <div className={`p-4 rounded-2xl flex items-center justify-center mb-2 transition-colors ${isActive ? 'bg-primary/20' : 'bg-glass-light'}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-center">{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MoreMenu;
