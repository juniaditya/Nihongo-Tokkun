'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookText, BookOpen, FileText, Lock } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Database } from '@/types/database.types';

type LessonCatalogRow = Database['public']['Views']['v_public_lesson_catalog']['Row'];

interface LessonTabsProps {
  lessons: LessonCatalogRow[];
  isAuthenticated: boolean;
}

const CATEGORIES: LessonCatalogRow['category'][] = ['kotoba', 'bunpou', 'dokkai'];

const CATEGORY_CONFIG: Record<
  LessonCatalogRow['category'],
  { label: string; labelJa: string; icon: React.ElementType; accentClass: string }
> = {
  kotoba: {
    label: 'Kotoba',
    labelJa: '語彙',
    icon: BookText,
    accentClass: 'border-indigo-500 text-indigo-400',
  },
  bunpou: {
    label: 'Bunpou',
    labelJa: '文法',
    icon: BookOpen,
    accentClass: 'border-emerald-500 text-emerald-400',
  },
  dokkai: {
    label: 'Dokkai',
    labelJa: '読解',
    icon: FileText,
    accentClass: 'border-amber-500 text-amber-400',
  },
};

export function LessonTabs({ lessons, isAuthenticated }: LessonTabsProps) {
  // Determine which categories actually have lessons
  const availableCategories = CATEGORIES.filter((cat) =>
    lessons.some((l) => l.category === cat)
  );

  const [activeCategory, setActiveCategory] = useState<LessonCatalogRow['category']>(
    availableCategories[0] ?? 'kotoba'
  );

  const filteredLessons = lessons
    .filter((l) => l.category === activeCategory)
    .sort((a, b) => a.number - b.number);

  if (availableCategories.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Belum ada lesson untuk kursus ini.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div
        role="tablist"
        aria-label="Pilih kategori"
        className="flex gap-1 rounded-xl border border-white/8 bg-white/4 p-1"
      >
        {availableCategories.map((cat) => {
          const config = CATEGORY_CONFIG[cat];
          const Icon = config.icon;
          const isActive = activeCategory === cat;
          const count = lessons.filter((l) => l.category === cat).length;

          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                isActive
                  ? 'bg-white/10 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive && config.accentClass.split(' ')[1])} />
              <span className="hidden sm:inline font-japanese">{config.labelJa}</span>
              <span className="hidden sm:inline">{config.label}</span>
              <span
                className={cn(
                  'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isActive ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-muted-foreground'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lesson List */}
      <div className="space-y-2" role="tabpanel">
        {filteredLessons.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada lesson untuk kategori ini.
          </p>
        ) : (
          filteredLessons.map((lesson) => {
            const isAccessible = isAuthenticated || lesson.is_guest_accessible;
            const lessonLabel =
              lesson.title ||
              `${CATEGORY_CONFIG[lesson.category].label} ${lesson.number}`;

            return isAccessible ? (
              <Link
                key={lesson.id}
                href={`/lessons/${lesson.id}`}
                className="group flex items-center gap-4 rounded-xl border border-white/8 bg-white/4 p-4 transition-all duration-200 hover:border-primary-500/30 hover:bg-white/8 hover:shadow-glow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/20 font-heading text-lg font-bold text-primary-400">
                  {lesson.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{lessonLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_CONFIG[lesson.category].labelJa} · Unit {lesson.number}
                    {lesson.time_limit_seconds && (
                      <span className="ml-2">⏱ {Math.round(lesson.time_limit_seconds / 60)} menit</span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-primary-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ) : (
              /* Locked lesson — visible but not navigable */
              <div
                key={lesson.id}
                className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/2 p-4 opacity-60"
                aria-label={`Lesson terkunci: ${lessonLabel}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 font-heading text-lg font-bold text-slate-500">
                  {lesson.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-muted-foreground truncate">{lessonLabel}</p>
                  <p className="text-xs text-muted-foreground/60">
                    {CATEGORY_CONFIG[lesson.category].labelJa} · Unit {lesson.number}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground/40" />
                </div>
              </div>
            );
          })
        )}

        {/* Guest CTA when lessons are locked */}
        {!isAuthenticated && filteredLessons.some((l) => !l.is_guest_accessible) && (
          <div className="mt-4 rounded-xl border border-primary-500/20 bg-primary-500/5 p-4 text-center">
            <p className="text-sm font-medium text-foreground mb-1">
              Beberapa lesson dikunci
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Daftar untuk membuka semua {filteredLessons.length} lesson.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Daftar Gratis
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
