import React from 'react';
import { cn } from '@/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  label?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  label,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border border-white/8 bg-white/4 p-6 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-muted-foreground/60">{icon}</div>}
      </div>
      
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        {label && <p className="text-sm text-muted-foreground font-medium">{label}</p>}
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'font-medium px-1.5 py-0.5 rounded-md',
              trend.isPositive
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {trend.isPositive ? '+' : '-'}
            {Math.abs(trend.value)}%
          </span>
          {trend.label && (
            <span className="text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
