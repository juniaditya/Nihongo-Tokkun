'use client';

import React from 'react';
import { Volume2, RotateCcw, BookOpen, Sparkles } from 'lucide-react';
import { playJapaneseAudio } from '@/lib/audio';
import type { Flashcard } from '@/types';

export interface FlashcardExtended extends Flashcard {
  kotoba?: {
    id: string;
    word: string;
    reading: string | null;
    meaning: string | null;
    explanation: string | null;
    is_supplementary: boolean;
  } | null;
  bunpou?: {
    id: string;
    grammar: string;
    meaning: string | null;
  } | null;
}

interface FlashcardViewProps {
  card: FlashcardExtended;
  isFlipped: boolean;
  onFlip: () => void;
  category: 'kotoba' | 'bunpou' | 'dokkai';
}

export function FlashcardView({ card, isFlipped, onFlip, category }: FlashcardViewProps) {
  const isKotoba = !!card.kotoba_id;
  const isBunpou = !!card.bunpou_id;

  // Resolve back content
  const reading = card.reading || card.kotoba?.reading || null;
  const meaning = card.meaning || card.kotoba?.meaning || card.bunpou?.meaning || null;
  const explanation = card.explanation || card.kotoba?.explanation || null;

  const handleAudioPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playJapaneseAudio(card.front);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Interactive Card */}
      <div
        onClick={!isFlipped ? onFlip : undefined}
        className={`relative w-full min-h-[340px] sm:min-h-[380px] rounded-2xl border transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between ${
          !isFlipped
            ? 'cursor-pointer border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] shadow-xl hover:border-indigo-500/40 hover:shadow-indigo-500/10 hover:-translate-y-0.5'
            : 'border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 via-white/[0.04] to-white/[0.02] shadow-2xl'
        }`}
        role="region"
        aria-label="Kartu Flashcard"
      >
        {/* Top bar on card */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {isKotoba ? '語彙 Kotoba' : isBunpou ? '文法 Bunpou' : 'Kartu'}
          </span>

          {/* Audio Pronunciation Button */}
          <button
            type="button"
            onClick={handleAudioPlay}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 transition-all hover:bg-indigo-500/25 hover:scale-105 active:scale-95"
            title="Dengarkan pengucapan Jepang (ja-JP)"
            aria-label="Dengarkan audio"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>

        {/* Card Center Content */}
        <div className="my-auto py-4 text-center space-y-4">
          {/* Japanese Front Text */}
          <div className="space-y-2">
            <p
              className="font-japanese text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-wide select-text leading-tight"
              lang="ja"
            >
              {card.front}
            </p>
          </div>

          {/* Back Content (Shown when flipped) */}
          {isFlipped && (
            <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in-50 zoom-in-95 duration-200">
              {/* Reading (Furigana / Kana) */}
              {reading && (
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase text-indigo-400 tracking-wider">
                    Cara Baca
                  </span>
                  <p className="font-japanese text-xl sm:text-2xl font-medium text-indigo-200" lang="ja">
                    {reading}
                  </p>
                </div>
              )}

              {/* Meaning (Arti Bahasa Indonesia) */}
              {meaning && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Arti
                  </span>
                  <p className="text-base sm:text-lg font-medium text-foreground">
                    {meaning}
                  </p>
                </div>
              )}

              {/* Explanation / Example (Penjelasan) */}
              {explanation && (
                <div className="rounded-xl bg-white/[0.03] border border-white/6 p-3.5 text-left text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-semibold mb-1 text-xs">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Penjelasan & Contoh:</span>
                  </div>
                  <p className="whitespace-pre-line text-foreground/90 font-japanese text-xs sm:text-sm">
                    {explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Bottom Hint / Action */}
        <div className="pt-3 text-center">
          {!isFlipped ? (
            <button
              type="button"
              onClick={onFlip}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-[0.99]"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Lihat Jawaban</span>
              <kbd className="hidden sm:inline-block ml-2 rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-mono text-white/80">
                Spasi
              </kbd>
            </button>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Pilih seberapa baik kamu mengingat kartu ini:</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
