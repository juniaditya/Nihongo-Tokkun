import React from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'kotoba' | 'bunpou' | 'dokkai' | 'outline' | 'success';
}

export function Badge({ className, variant = 'primary', children, ...props }: BadgeProps) {
  const variants = {
    primary:
      'bg-primary-500/15 text-primary-400 border border-primary-500/30',
    secondary:
      'bg-pink-500/15 text-pink-400 border border-pink-500/30',
    kotoba:
      'bg-kotoba-bg text-indigo-400 dark:text-indigo-300 border border-kotoba/30',
    bunpou:
      'bg-bunpou-bg text-amber-500 dark:text-amber-300 border border-bunpou/30',
    dokkai:
      'bg-dokkai-bg text-emerald-500 dark:text-emerald-300 border border-dokkai/30',
    outline:
      'bg-transparent text-foreground border border-border',
    success:
      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
