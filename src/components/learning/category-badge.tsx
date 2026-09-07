import React from 'react';
import { cn } from '@/utils/cn';
import type { LessonCategory } from '@/types';

interface CategoryBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  category: LessonCategory | string;
  size?: 'sm' | 'md';
}

const CATEGORY_MAP: Record<string, { label: string; labelJa: string; style: string }> = {
  kotoba: {
    label: 'Kotoba',
    labelJa: '語彙',
    style: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
  },
  bunpou: {
    label: 'Bunpou',
    labelJa: '文法',
    style: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
  dokkai: {
    label: 'Dokkai',
    labelJa: '読解',
    style: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
};

export function CategoryBadge({
  category,
  size = 'md',
  className,
  ...props
}: CategoryBadgeProps) {
  const norm = (category || 'kotoba').toLowerCase();
  const config = CATEGORY_MAP[norm] || CATEGORY_MAP.kotoba;

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded',
    md: 'text-xs px-2 py-0.5 rounded-md',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border font-medium font-heading',
        sizes[size],
        config.style,
        className
      )}
      {...props}
    >
      <span className="font-japanese text-[11px] font-bold">{config.labelJa}</span>
      <span>{config.label}</span>
    </span>
  );
}
