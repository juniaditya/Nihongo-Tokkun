'use client';

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

export interface DokkaiPassage {
  id: string;
  title: string | null;
  passage_type: string;
  passage: string | null;
  passage_a: string | null;
  passage_b: string | null;
}

interface DokkaiReaderProps {
  passage: DokkaiPassage;
}

/** Renders the text of a Dokkai passage, preserving line breaks. */
function PassageText({ text }: { text: string }) {
  return (
    <p className="font-japanese text-sm md:text-[15px] leading-loose text-foreground/90 whitespace-pre-wrap">
      {text}
    </p>
  );
}

/**
 * DokkaiReader — displays a reading passage above practice questions.
 * - Desktop (900px+): sticky beside questions, with scrolling for long passages.
 * - Mobile: collapsible accordion to save vertical space.
 * - Supports single `passage` and split `passage_a` / `passage_b` (tougou type).
 */
export function DokkaiReader({ passage }: DokkaiReaderProps) {
  const [isOpen, setIsOpen] = useState(true);

  const hasAB = !!(passage.passage_a || passage.passage_b);
  const hasSingle = !!passage.passage;

  const passageTypeLabel = getPassageTypeLabel(passage.passage_type);

  return (
    <aside
      aria-label="Teks Bacaan Dokkai"
      className="min-w-0 rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/30 via-card/80 to-card backdrop-blur-md shadow-glass overflow-hidden app:sticky app:top-6 app:max-h-[calc(100dvh-3rem)] app:overflow-y-auto"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 md:py-3.5 text-left hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-t-2xl"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400/80">
              Teks Bacaan · {passageTypeLabel}
            </span>
            {passage.title && (
              <p className="font-heading text-sm font-semibold text-foreground truncate">
                {passage.title}
              </p>
            )}
          </div>
        </div>
        <span className="shrink-0 text-muted-foreground app:hidden">
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>

      {/* Body — always visible on desktop, collapsible on mobile */}
      <div
        className={`px-4 pb-4 space-y-4 transition-all duration-300 ${
          isOpen ? 'block' : 'hidden app:block'
        }`}
      >
        {/* Single passage */}
        {hasSingle && !hasAB && passage.passage && (
          <div className="rounded-xl border border-white/8 bg-white/4 p-4">
            <PassageText text={passage.passage} />
          </div>
        )}

        {/* A+B split passages (tougou / jouhou style) */}
        {hasAB && (
          <div className="grid gap-3">
            {passage.passage_a && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-4 space-y-2">
                <span className="inline-block rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                  Teks A
                </span>
                <PassageText text={passage.passage_a} />
              </div>
            )}
            {passage.passage_b && (
              <div className="rounded-xl border border-white/8 bg-white/4 p-4 space-y-2">
                <span className="inline-block rounded-md bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-pink-300">
                  Teks B
                </span>
                <PassageText text={passage.passage_b} />
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function getPassageTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    tanbun: '短文',
    chuubun: '中文',
    tougou: '統合理解',
    chobun: '長文',
    jouhou: '情報検索',
  };
  return labels[type.toLowerCase()] ?? type;
}
