import React from 'react';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const ShimmerButton: React.FC<ShimmerButtonProps> = ({ children, className, variant = 'primary', ...props }) => {
  const baseClasses = 'shimmer-button w-full flex justify-center items-center py-3 px-4 rounded-lg text-sm font-medium transition-all duration-500 ease-out hover:scale-[1.02] hover:-translate-y-1 active:scale-95';
  const variantClasses = variant === 'primary'
    ? 'shimmer-button-primary text-black bg-primary hover:bg-primary-hover'
    : 'shimmer-button-secondary border border-border-color text-text-primary bg-glass hover:bg-glass-light';

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default ShimmerButton;
