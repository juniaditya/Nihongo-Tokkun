import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CategoryCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color?: 'primary' | 'secondary' | 'indigo' | 'emerald' | 'amber' | 'rose';
  className?: string;
}

export function CategoryCard({
  title,
  description,
  icon,
  href,
  color = 'primary',
  className,
}: CategoryCardProps) {
  const colorStyles = {
    primary: 'from-primary-500/20 to-primary-600/10 border-primary-500/20 text-primary-400 group-hover:border-primary-500/50',
    secondary: 'from-secondary-500/20 to-secondary-600/10 border-secondary-500/20 text-secondary-400 group-hover:border-secondary-500/50',
    indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/20 text-indigo-400 group-hover:border-indigo-500/50',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400 group-hover:border-emerald-500/50',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400 group-hover:border-amber-500/50',
    rose: 'from-rose-500/20 to-rose-600/10 border-rose-500/20 text-rose-400 group-hover:border-rose-500/50',
  };

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col items-start p-6 rounded-2xl overflow-hidden transition-all duration-300',
        'bg-gradient-to-br border backdrop-blur-sm',
        'hover:shadow-glow hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        colorStyles[color],
        className
      )}
    >
      <div className="flex w-full items-start justify-between mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 shadow-sm">
          {icon}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50 transition-all group-hover:translate-x-1 group-hover:opacity-100 group-hover:text-foreground" />
      </div>
      <h3 className="font-heading text-xl font-bold text-foreground mb-1">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {description}
      </p>
    </Link>
  );
}
