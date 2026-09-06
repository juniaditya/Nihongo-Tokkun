import React from 'react';
import Link from 'next/link';
import { PlayCircle, CheckCircle2, Lock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ProgressBar } from '@/components/ui/progress-bar';

interface LessonCardProps {
  id: string;
  title: string;
  description?: string;
  order: number;
  isUnlocked: boolean;
  isCompleted?: boolean;
  progress?: number;
  href?: string;
  className?: string;
}

export function LessonCard({
  title,
  description,
  order,
  isUnlocked,
  isCompleted,
  progress = 0,
  href = '#',
  className,
}: LessonCardProps) {
  return (
    <Link
      href={isUnlocked ? href : '#'}
      className={cn(
        'group relative flex items-center p-4 rounded-xl border transition-all duration-300',
        isUnlocked
          ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary-500/30 hover:shadow-glow-sm cursor-pointer'
          : 'bg-white/2 border-white/5 opacity-60 cursor-not-allowed',
        className
      )}
      aria-disabled={!isUnlocked}
    >
      {/* Order indicator */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg mr-4 font-heading font-bold text-lg transition-colors',
          isCompleted
            ? 'bg-green-500/20 text-green-400'
            : isUnlocked
            ? 'bg-primary-500/20 text-primary-400'
            : 'bg-slate-800 text-slate-500'
        )}
      >
        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : order}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 mr-4">
        <h4 className={cn('font-semibold truncate', !isUnlocked && 'text-muted-foreground')}>
          {title}
        </h4>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
        
        {/* Progress bar */}
        {isUnlocked && !isCompleted && progress > 0 && (
          <div className="mt-2">
            <ProgressBar value={progress} size="sm" variant="primary" />
          </div>
        )}
      </div>

      {/* Action icon */}
      <div className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary-400">
        {!isUnlocked ? (
          <Lock className="h-5 w-5" />
        ) : isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        ) : (
          <PlayCircle className="h-6 w-6" />
        )}
      </div>
    </Link>
  );
}
