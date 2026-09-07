import { lessonStatusLabels, type LessonStatus } from '@/lib/learning-progress';
import { cn } from '@/utils/cn';

export function LessonStatusBadge({ status = 'not_started' }: { status?: LessonStatus }) {
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-medium',
    status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' :
    status === 'in_progress' ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300' :
    'border-white/10 bg-white/5 text-muted-foreground'
  )}>{lessonStatusLabels[status]}</span>;
}
