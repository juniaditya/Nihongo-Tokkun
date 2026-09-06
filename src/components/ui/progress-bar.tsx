import React from 'react';
import { cn } from '@/utils/cn';

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  className,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 'h-1.5 text-[10px]',
    md: 'h-2.5 text-xs',
    lg: 'h-4 text-sm',
  };

  const variants = {
    primary: 'bg-gradient-to-r from-primary-500 to-indigo-500',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500',
    warning: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    danger: 'bg-gradient-to-r from-red-500 to-rose-500',
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)} {...props}>
      {showLabel && (
        <div className="flex justify-between items-center px-0.5">
          <span className="font-medium text-muted-foreground text-xs">Progress</span>
          <span className="font-bold text-foreground text-xs">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-white/10 dark:bg-slate-800/60 rounded-full overflow-hidden backdrop-blur-sm',
          sizes[size].split(' ')[0]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variants[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
