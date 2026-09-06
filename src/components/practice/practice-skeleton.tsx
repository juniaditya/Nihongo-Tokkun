import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function PracticeSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10 space-y-6 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-6 w-16 rounded-lg" />
      </div>

      {/* Progress Bar Skeleton */}
      <Skeleton className="h-2.5 w-full rounded-full" />

      {/* Question Card Skeleton */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-4">
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-8 w-3/4 rounded-lg" />
        <Skeleton className="h-6 w-1/2 rounded-lg" />
      </div>

      {/* Options Skeleton */}
      <div className="grid gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>

      {/* Bottom Action Skeleton */}
      <div className="flex justify-end pt-2">
        <Skeleton className="h-12 w-32 rounded-xl" />
      </div>
    </div>
  );
}
