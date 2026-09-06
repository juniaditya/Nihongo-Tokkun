import React from 'react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none';

    const variants = {
      primary:
        'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md hover:from-primary-500 hover:to-indigo-500 hover:shadow-glow',
      secondary:
        'bg-gradient-to-r from-pink-600 to-secondary-500 text-white shadow-md hover:from-pink-500 hover:to-secondary-400 hover:shadow-glow-pink',
      outline:
        'border border-border bg-transparent hover:bg-white/5 dark:hover:bg-white/10 text-foreground',
      ghost:
        'bg-transparent hover:bg-white/10 dark:hover:bg-white/5 text-foreground',
      glass:
        'bg-white/10 dark:bg-slate-800/60 backdrop-blur-md border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-slate-700/60 shadow-glass-sm',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
      md: 'h-10 px-4 text-sm rounded-xl gap-2',
      lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
      icon: 'h-10 w-10 p-0 rounded-xl',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
