import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) => {
  const variants = {
    primary: 'bg-[#007AFF] text-white hover:bg-[#0062cc]',
    secondary: 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20',
    outline: 'bg-transparent border border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/10',
    ghost: 'bg-transparent text-white/70 hover:bg-white/10',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm font-medium',
    lg: 'px-6 py-3 text-base font-semibold',
    xl: 'px-10 py-5 text-xl font-bold',
  };

  return (
    <button
      className={cn(
        'rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};
