'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TtsButton } from '@/components/TtsButton';
import type { FlashAttemptSubmission, FlashReviewSubmission } from '@/lib/runtimeDtos';
import type { FlashcardSessionData } from '@/lib/types';
import { ReviewExitDialog } from './ReviewExitDialog';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Grade = 'Good' | 'Again';

function clientKey(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID().replace(/-/g, '')}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatNextDue(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function internalHref(anchor: HTMLAnchorElement) {
  const raw = anchor.getAttribute('href');
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return null;
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return null;
  const url = new URL(raw, window.location.href);
  if (url.origin !== window.location.origin) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function FlashcardShell({ session }: { session: FlashcardSessionData }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviews, setReviews] = useState<FlashReviewSubmission[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [serverScore, setServerScore] = useState<number | null>(null);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [ttsBackPlaySeq, setTtsBackPlaySeq] = useState(0);
  const [pendingExitHref, setPendingExitHref] = useState('/courses');
  const startedAtRef = useRef(new Date().toISOString());
  const startedAtMsRef = useRef(Date.now());
  const cardStartedAtMsRef = useRef(Date.now());
  const attemptKeyRef = useRef(clientKey(session.mode === 'review' ? 'reviewcard' : 'flashcard'));

  const card = session.cards[index] ?? null;
  const total = session.cards.length;
  const done = total > 0 && index >= total;
  const good = useMemo(() => reviews.filter((r) => r.result === 'Good').length, [reviews]);
  const again = reviews.length - good;
  const localScore = reviews.length ? Math.round((good / reviews.length) * 100) : 0;
  const hasUnsavedReviewProgress = session.mode === 'review' && reviews.length > 0 && !done && saveState !== 'saved';

  const finish = useCallback(async (finalReviews: FlashReviewSubmission[]): Promise<boolean> => {
    if (!finalReviews.length || saveState === 'saving' || saveState === 'saved') return false;
    const completedAt = new Date().toISOString();
    const payload: FlashAttemptSubmission = {
      clientAttemptKey: attemptKeyRef.current,
      startedAt: startedAtRef.current,
      completedAt,
      durationMs: Math.max(0, Date.now() - startedAtMsRef.current),
      kategori: session.lesson.category,
      nomor: session.lesson.lessonNumber,
      bagian: session.mode === 'review' || session.lesson.category === 'kotoba_tambahan' || session.lesson.category === 'bunpou_tambahan' ? 'flashcard' : 'latihan',
      reviews: finalReviews,
    };
    setSaveState('saving');
    setSaveMessage('Menyimpan progres ke Supabase...');
    try {
      const response = await fetch('/api/flashcard-attempt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
      setServerScore(Number(body.skor ?? body.score ?? localScore));
      setSaveState('saved');
      setSaveMessage('Progress tersimpan ✓');
      return true;
    } catch (error) {
      setSaveState('error');
      setSaveMessage(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [localScore, saveState, session.lesson.category, session.lesson.lessonNumber, session.mode]);

  const grade = useCallback((result: Grade) => {
    if (!card || !flipped || saveState === 'saving') return;
    const reviewedAt = new Date().toISOString();
    const record: FlashReviewSubmission = {
      cardId: card.id,
      result,
      responseTimeMs: Math.max(0, Date.now() - cardStartedAtMsRef.current),
      reviewedAt,
      sourceType: card.sourceType,
      sourceKategori: card.sourceKategori,
      sourceNomor: card.sourceNomor,
      sourceBagian: card.sourceBagian,
    };
    const nextReviews = [...reviews, record];
    setReviews(nextReviews);
    if (index + 1 >= total) {
      setIndex(total);
      setFlipped(false);
      void finish(nextReviews);
    } else {
      setIndex((v) => v + 1);
      setFlipped(false);
      cardStartedAtMsRef.current = Date.now();
    }
  }, [card, flipped, finish, index, reviews, saveState, total]);

  const requestExit = useCallback((href = '/courses') => {
    if (hasUnsavedReviewProgress) {
      setPendingExitHref(href);
      setExitDialogOpen(true);
      return;
    }
    window.location.assign(href);
  }, [hasUnsavedReviewProgress]);

  const saveAndExit = useCallback(async () => {
    const saved = await finish(reviews);
    if (!saved) return;
    setExitDialogOpen(false);
    window.location.assign(pendingExitHref);
  }, [finish, pendingExitHref, reviews]);

  const toggleCard = useCallback(() => {
    if (flipped) {
      setFlipped(false);
      return;
    }
    setFlipped(true);
    setTtsBackPlaySeq((value) => value + 1);
  }, [flipped]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)) return;
      const key = event.key.toLowerCase();
      if (!done && (key === 's' || key === 'o' || event.key === ' ' || event.key === 'ArrowDown')) {
        event.preventDefault();
        toggleCard();
      } else if (!done && flipped && (key === 'a' || key === 'j' || key === 'i' || event.key === 'ArrowLeft')) {
        event.preventDefault();
        grade('Again');
      } else if (!done && flipped && (key === 'd' || key === 'l' || key === 'p' || event.key === 'ArrowRight')) {
        event.preventDefault();
        grade('Good');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [done, flipped, grade, toggleCard]);

  useEffect(() => {
    if (!hasUnsavedReviewProgress) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const interceptNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      const href = internalHref(target);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingExitHref(href);
      setExitDialogOpen(true);
    };

    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', interceptNavigation, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', interceptNavigation, true);
    };
  }, [hasUnsavedReviewProgress]);

  if (total === 0) {
    return (
      <div className="panel fade-in result-panel">
        <div className="crumbs">{session.lesson.label}</div>
        <div className="result-stamp">0</div>
        <h2>{session.lesson.category === 'kotoba_tambahan'
          ? 'Tidak ada Kotoba Tambahan baru.'
          : session.lesson.category === 'bunpou_tambahan'
          ? 'Belum ada Bunpou Tambahan.'
          : 'Tidak ada kartu yang perlu direview.'}</h2>
        <p className="result-sub">
          {session.lesson.category === 'kotoba_tambahan'
            ? 'Kotoba yang sudah diberi rating pertama otomatis masuk ke antrean FSRS Review Kotoba.'
            : session.lesson.category === 'bunpou_tambahan'
            ? 'Tambahkan bunpou dari tombol Catat Kotoba / Bunpou saat Latihan Campuran atau Dokkai.'
            : formatNextDue(session.nextDueAt)
            ? `Review berikutnya: ${formatNextDue(session.nextDueAt)} WITA`
            : 'Belum ada kartu terjadwal.'}
        </p>
        <div className="action-row">
          {session.lesson.category === 'kotoba_tambahan' && <Link className="btn-primary" href="/review">Buka Review Kotoba</Link>}
          <Link className="btn-ghost" href="/courses">Kembali ke Kursus</Link>
        </div>
      </div>
    );
  }

  if (done) {
    const score = serverScore ?? localScore;
    return (
      <div className="panel fade-in result-panel">
        <div className="crumbs">{session.lesson.label} <span>›</span> Selesai</div>
        <div className="result-stamp">{score}%</div>
        <p className="result-sub">{good} Good · {again} Again · {total} kartu</p>
        <p className={`save-note ${saveState === 'error' ? 'err' : ''}`}>{saveMessage || 'Menyiapkan penyimpanan...'}</p>
        {saveState === 'error' && (
          <button className="btn-primary" type="button" onClick={() => void finish(reviews)}>Coba Simpan Lagi</button>
        )}
        <div className="action-row">
          <Link className="btn-ghost" href="/courses">← Kembali ke Kursus</Link>
          {session.mode === 'review' && <Link className="btn-primary" href="/review">Muat Review Lagi</Link>}
        </div>
      </div>
    );
  }

  const speechText = flipped ? card.reading || card.front : card.front;

  return (
    <>
      <ReviewExitDialog
        open={exitDialogOpen}
        reviewed={reviews.length}
        total={total}
        saveState={saveState}
        saveMessage={saveMessage}
        onCancel={() => {
          if (saveState !== 'saving') {
            setExitDialogOpen(false);
            setSaveMessage('');
            if (saveState === 'error') setSaveState('idle');
          }
        }}
        onSaveAndExit={() => void saveAndExit()}
      />

      <div className="panel fade-in quiz-panel">
        <div className="crumbs">{session.lesson.label} <span>›</span> {session.mode === 'review' ? 'Review FSRS' : 'Latihan Flashcard'}</div>
        <div className="progress-row">
          <div className="progress-track"><div className="progress-fill" style={{ width: `${(index / total) * 100}%` }} /></div>
          <span className="progress-label">{index + 1} / {total}</span>
        </div>

        <div className="flashcard-tts-toolbar">
          <TtsButton
            text={speechText}
            label={flipped && card.reading ? 'Dengarkan cara baca' : 'Dengarkan'}
            autoPlay={flipped}
            autoPlayKey={flipped ? `${card.id}:back:${ttsBackPlaySeq}` : null}
            showSettings
          />
        </div>

        <div className="flashcard-wrap">
          <button
            type="button"
            className={`flashcard-card n2-flashcard-center ${flipped ? 'grid-layout' : ''}`}
            onClick={toggleCard}
            aria-label={flipped ? 'Tampilkan soal' : 'Tampilkan jawaban'}
          >
            {!flipped ? (
              <>
                <span className="flashcard-face-badge">Soal</span>
                <p className="flashcard-text" lang="ja">{card.front}</p>
              </>
            ) : (
              <>
                <span className="flashcard-face-badge back">Jawaban</span>
                <div className="flashcard-back-content">
                  {card.backFields.map((field) => (
                    <div className="fc-field" key={field.label}>
                      <span className="fc-field-label">{field.label}</span>
                      <p className="fc-field-value" lang="ja">{field.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </button>


          {flipped ? (
            <>
              <div className="grade-row">
                <button className="grade-btn grade-again" type="button" onClick={() => grade('Again')}>😓 Again <span className="key-hint">A / ←</span></button>
                <button className="grade-btn grade-good" type="button" onClick={() => grade('Good')}>✅ Good <span className="key-hint">D / →</span></button>
              </div>
              <p className="grade-hint">Belum hafal? Pilih <b>Again</b>. Sudah hafal? Pilih <b>Good</b>.</p>
            </>
          ) : (
            <p className="flashcard-hint">Klik kartu, atau tekan <b>S</b> / <b>Spasi</b> / <b>↓</b> untuk melihat jawaban.</p>
          )}

          <div className="action-row">
            {session.mode === 'review' ? (
              <button className="btn-ghost" type="button" onClick={() => requestExit('/courses')}>Keluar Sesi</button>
            ) : (
              <Link className="btn-ghost" href="/courses">Keluar Sesi</Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
