import React from 'react';
import { cn } from '@/utils/cn';

export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

interface JLPTBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  level: JLPTLevel | string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'glass';
}

export function JLPTBadge({
  level,
  size = 'md',
  variant = 'solid',
  className,
  ...props
}: JLPTBadgeProps) {
  const normalizedLevel = level.toUpperCase();
  
  // Base colors for each JLPT level based on conventional Japanese learning apps
  const levelColors: Record<string, string> = {
    N5: 'from-blue-500 to-blue-600 border-blue-500 text-blue-500',
    N4: 'from-green-500 to-green-600 border-green-500 text-green-500',
    N3: 'from-amber-500 to-amber-600 border-amber-500 text-amber-500',
    N2: 'from-purple-500 to-purple-600 border-purple-500 text-purple-500',
    N1: 'from-red-500 to-red-600 border-red-500 text-red-500',
  };

  const defaultColor = 'from-primary-500 to-secondary-500 border-primary-500 text-primary-500';
  const colorConfig = levelColors[normalizedLevel] || defaultColor;

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded',
    md: 'text-xs px-2 py-0.5 rounded-md',
    lg: 'text-sm px-2.5 py-1 rounded-lg',
  };

  const variants = {
    solid: `bg-gradient-to-r text-white shadow-sm border-transparent ${colorConfig.split(' ').slice(0, 2).join(' ')}`,
    outline: `bg-transparent border border-current ${colorConfig.split(' ').pop()}`,
    glass: `bg-white/10 backdrop-blur-md border border-current/20 ${colorConfig.split(' ').pop()}`,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-bold tracking-widest uppercase',
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {normalizedLevel}
    </span>
  );
}
