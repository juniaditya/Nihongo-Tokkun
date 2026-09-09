import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Clock } from 'lucide-react';


interface PracticeHeaderProps {
  lessonId: string;
  lessonTitle: string;
  category: 'kotoba' | 'bunpou' | 'dokkai';
  questionTypeLabel: string;
  currentIndex: number;
  totalQuestions: number;
  timeLimitSeconds: number | null;
  startedAt: string | null;
  onTimeExpired?: () => void;
  isCompleted?: boolean;
}

export function PracticeHeader({
  lessonId,
  lessonTitle,
  category,
  questionTypeLabel,
  currentIndex,
  totalQuestions,
  timeLimitSeconds,
  startedAt,
  onTimeExpired,
  isCompleted = false,
}: PracticeHeaderProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const progressPercent = totalQuestions > 0 ? Math.min(100, Math.round(((currentIndex) / totalQuestions) * 100)) : 0;

  // Category styling
  const categoryStyles = {
    kotoba: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    bunpou: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    dokkai: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  };

  // Timer countdown hook
  useEffect(() => {
    if (!timeLimitSeconds || !startedAt || isCompleted) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const startTime = new Date(startedAt).getTime();
      const endTime = startTime + timeLimitSeconds * 1000;
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
      return diffSeconds;
    };

    const initial = calculateTimeLeft();
    setTimeLeft(initial);

    if (initial <= 0) {
      onTimeExpired?.();
      return;
    }

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onTimeExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLimitSeconds, startedAt, isCompleted, onTimeExpired]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <header className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href={`/lessons/${lessonId}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Tutup sesi latihan"
            >
              <X className="h-4 w-4" />
            </Link>

            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">
                {lessonTitle}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${categoryStyles[category]}`}
                >
                  {questionTypeLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Timer Display */}
            {timeLeft !== null && (
              <div
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono font-medium transition-colors ${
                  timeLeft < 60
                    ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                }`}
                aria-live="polite"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            )}

            {/* Question Counter */}
            <div className="text-xs font-semibold text-muted-foreground">
              <span className="text-foreground text-sm font-bold">{currentIndex}</span> / {totalQuestions}
            </div>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </header>

    </>
  );
}
