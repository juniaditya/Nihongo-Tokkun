import React from 'react';
import { cn } from '@/utils/cn';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'glass' | 'ghost' | 'primary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'glass', size = 'md', label, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.95] select-none';

    const variants = {
      glass:
        'bg-white/10 dark:bg-white/5 border border-white/10 hover:bg-white/15 dark:hover:bg-white/10 text-foreground shadow-sm',
      ghost: 'bg-transparent hover:bg-white/10 text-foreground',
      primary:
        'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-glow hover:opacity-90',
      outline:
        'border border-border bg-transparent hover:bg-white/5 text-foreground',
    };

    const sizes = {
      sm: 'h-8 w-8 p-1.5 text-xs',
      md: 'h-10 w-10 p-2 text-sm',
      lg: 'h-12 w-12 p-3 text-base',
    };

    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
