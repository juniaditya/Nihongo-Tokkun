import React from 'react';
import { cn } from '@/utils/cn';

interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'online' | 'offline' | 'away' | 'busy' | 'active' | 'inactive';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

export function StatusIndicator({
  status,
  size = 'md',
  showLabel = false,
  label,
  className,
  ...props
}: StatusIndicatorProps) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const colors = {
    online: 'bg-green-500',
    active: 'bg-green-500',
    offline: 'bg-slate-500',
    inactive: 'bg-slate-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)} {...props}>
      <span className="relative flex h-full w-full items-center justify-center">
        {/* Ping animation for active states */}
        {(status === 'online' || status === 'active') && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              colors[status]
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full',
            sizes[size],
            colors[status]
          )}
        />
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground capitalize">
          {label || status}
        </span>
      )}
    </div>
  );
}
