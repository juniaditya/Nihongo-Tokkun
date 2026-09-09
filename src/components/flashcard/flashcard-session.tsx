'use client';

import { useRouter } from 'next/navigation';
import { SessionExitGuard } from '@/components/learning/session-exit-guard';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FlashcardHeader } from './flashcard-header';
import { FlashcardView, type FlashcardExtended } from './flashcard-view';
import { FlashcardRatingBar } from './flashcard-rating-bar';
import { FlashcardCompletion } from './flashcard-completion';
import { playJapaneseAudio } from '@/lib/audio';
import type { JLPTLevel, LessonCategory } from '@/types';

interface FlashcardSessionProps {
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string | null;
  courseLevel?: JLPTLevel | null;
  category: LessonCategory;
  initialCards: FlashcardExtended[];
}

export function FlashcardSession({
  lessonId,
  lessonNumber,
  lessonTitle,
  courseLevel,
  category,
  initialCards,
}: FlashcardSessionProps) {
  const [cards] = useState<FlashcardExtended[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingRating, setPendingRating] = useState<'again' | 'good' | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [autoAudio, setAutoAudio] = useState(false);
  const [goodCount, setGoodCount] = useState(0);
  const [againCount, setAgainCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const currentCard = cards[currentIndex] || null;
  const totalCards = cards.length;

  // Play audio on card transition if autoAudio is enabled
  useEffect(() => {
    if (autoAudio && currentCard && !isCompleted) {
      playJapaneseAudio(currentCard.front);
    }
  }, [currentIndex, autoAudio, currentCard, isCompleted]);

  // Handle Flip
  const handleFlip = useCallback(() => {
    if (!isFlipped && !isSubmitting) {
      setIsFlipped(true);
    }
  }, [isFlipped, isSubmitting]);

  // Handle Review Submission with Idempotency Key Resiliency
  const handleRate = useCallback(
    async (rating: 'again' | 'good', overrideRequestId?: string) => {
      if (!currentCard || isSubmitting) return;

      // Reuse existing requestId on retry, or generate new UUID
      const requestId = overrideRequestId || pendingRequestId || crypto.randomUUID();
      setPendingRequestId(requestId);
      setPendingRating(rating);
      setIsSubmitting(true);
      setLastError(null);

      try {
        const { data, error } = await (supabase.rpc as any)('submit_flashcard_review', {
          p_flashcard_id: currentCard.id,
          p_rating: rating,
          p_request_id: requestId,
        });

        if (error) {
          console.error('[Flashcard] Submit error:', error);
          setLastError(error.message || 'Gagal menyimpan review. Silakan coba lagi.');
          setIsSubmitting(false);
          return;
        }

        // Update local session stats
        if (rating === 'good') {
          setGoodCount((prev) => prev + 1);
        } else {
          setAgainCount((prev) => prev + 1);
        }

        // Clean up pending state
        setPendingRequestId(null);
        setPendingRating(null);
        setIsSubmitting(false);
        setIsFlipped(false);

        // Advance to next card or complete
        if (currentIndex + 1 < totalCards) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsCompleted(true);
          router.refresh();
        }
      } catch (err: any) {
        console.error('[Flashcard] Network exception:', err);
        setLastError(err?.message || 'Koneksi terputus. Silakan coba lagi.');
        setIsSubmitting(false);
      }
    },
    [currentCard, isSubmitting, pendingRequestId, currentIndex, totalCards, supabase, router]
  );

  const handleRetry = useCallback(() => {
    if (pendingRating && pendingRequestId) {
      handleRate(pendingRating, pendingRequestId);
    }
  }, [pendingRating, pendingRequestId, handleRate]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is in input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (isCompleted || document.querySelector('[role=dialog]')) return;

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (!isFlipped) {
          handleFlip();
        }
      } else if (e.key === '1' && isFlipped && !isSubmitting) {
        e.preventDefault();
        handleRate('again');
      } else if (e.key === '2' && isFlipped && !isSubmitting) {
        e.preventDefault();
        handleRate('good');
      } else if ((e.key === 'a' || e.key === 'A') && currentCard) {
        e.preventDefault();
        playJapaneseAudio(currentCard.front);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isSubmitting, isCompleted, currentCard, handleFlip, handleRate]);

  // Restart Session
  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsSubmitting(false);
    setLastError(null);
    setPendingRequestId(null);
    setPendingRating(null);
    setGoodCount(0);
    setAgainCount(0);
    setIsCompleted(false);
  };

  if (!currentCard || totalCards === 0) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-16 space-y-4">
        <p className="text-lg font-medium text-foreground">Tidak ada kartu flashcard aktif untuk lesson ini.</p>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <FlashcardCompletion
        lessonId={lessonId}
        lessonNumber={lessonNumber}
        lessonTitle={lessonTitle}
        category={category}
        totalCards={totalCards}
        goodCount={goodCount}
        againCount={againCount}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 sm:space-y-8">
      <SessionExitGuard active={!isCompleted && totalCards > 0} kind="flashcard" />
      {/* Session Header */}
      <FlashcardHeader
        lessonId={lessonId}
        lessonNumber={lessonNumber}
        lessonTitle={lessonTitle}
        courseLevel={courseLevel}
        category={category}
        currentIndex={currentIndex}
        totalCards={totalCards}
        autoAudio={autoAudio}
        onToggleAutoAudio={() => setAutoAudio((prev) => !prev)}
      />

      {/* Main Flashcard View */}
      <FlashcardView
        card={currentCard}
        isFlipped={isFlipped}
        onFlip={handleFlip}
        category={category}
      />

      {/* Rating Bar (shown only when card is flipped) */}
      {isFlipped && (
        <div className="animate-in fade-in-50 slide-in-from-bottom-3 duration-200">
          <FlashcardRatingBar
            isSubmitting={isSubmitting}
            onRate={handleRate}
            lastError={lastError}
            onRetry={handleRetry}
          />
        </div>
      )}
    </div>
  );
}
