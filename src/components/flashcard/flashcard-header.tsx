'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Volume2, VolumeX, Layers } from 'lucide-react';
import { JLPTBadge } from '@/components/learning/jlpt-badge';
import { CategoryBadge } from '@/components/learning/category-badge';
import type { JLPTLevel, LessonCategory } from '@/types';

interface FlashcardHeaderProps {
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string | null;
  courseLevel?: JLPTLevel | null;
  category: LessonCategory;
  currentIndex: number;
  totalCards: number;
  autoAudio: boolean;
  onToggleAutoAudio: () => void;
}

export function FlashcardHeader({
  lessonId,
  lessonNumber,
  lessonTitle,
  courseLevel,
  category,
  currentIndex,
  totalCards,
  autoAudio,
  onToggleAutoAudio,
}: FlashcardHeaderProps) {
  const progressPercent = totalCards > 0 ? Math.min(100, Math.round(((currentIndex + 1) / totalCards) * 100)) : 0;

  return (
    <header className="w-full space-y-3">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-3">
        {/* Back Link */}
        <Link
          href={`/lessons/${lessonId}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          aria-label="Kembali ke unit lesson"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Kembali ke Unit</span>
        </Link>

        {/* Center Title & Badges */}
        <div className="flex items-center gap-2">
          {courseLevel && <JLPTBadge level={courseLevel} size="sm" />}
          <CategoryBadge category={category} size="sm" />
          <span className="font-heading text-xs font-semibold text-foreground truncate max-w-[140px] sm:max-w-xs">
            Unit {lessonNumber} {lessonTitle ? `— ${lessonTitle}` : ''}
          </span>
        </div>

        {/* Audio auto-play toggle */}
        <button
          type="button"
          onClick={onToggleAutoAudio}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
            autoAudio
              ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
              : 'border-white/10 bg-white/5 text-muted-foreground hover:text-foreground'
          }`}
          title={autoAudio ? 'Audio otomatis aktif' : 'Audio otomatis nonaktif'}
          aria-label="Toggle auto audio pronunciation"
        >
          {autoAudio ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{autoAudio ? 'Audio Otomatis' : 'Audio Manual'}</span>
        </button>
      </div>

      {/* Progress row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-semibold text-foreground">
            Kartu <span className="text-indigo-400 font-bold">{currentIndex + 1}</span> / {totalCards}
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{progressPercent}%</span>
      </div>

      {/* Animated progress bar */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-white/5 border border-white/8"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
}
