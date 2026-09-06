'use client';

import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'right',
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2.5',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-white/15 bg-slate-900/90 px-2.5 py-1 text-xs font-medium text-white shadow-xl backdrop-blur-md animate-fade-in',
            positions[position],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
