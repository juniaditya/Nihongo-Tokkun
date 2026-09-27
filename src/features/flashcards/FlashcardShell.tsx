'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlashAttemptSubmission, FlashReviewSubmission } from '@/lib/runtimeDtos';
import type { FlashcardSessionData } from '@/lib/types';

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

export function FlashcardShell({ session }: { session: FlashcardSessionData }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviews, setReviews] = useState<FlashReviewSubmission[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [serverScore, setServerScore] = useState<number | null>(null);
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

  const finish = useCallback(async (finalReviews: FlashReviewSubmission[]) => {
    if (saveState === 'saving' || saveState === 'saved') return;
    const completedAt = new Date().toISOString();
    const payload: FlashAttemptSubmission = {
      clientAttemptKey: attemptKeyRef.current,
      startedAt: startedAtRef.current,
      completedAt,
      durationMs: Math.max(0, Date.now() - startedAtMsRef.current),
      kategori: session.lesson.category,
      nomor: session.lesson.lessonNumber,
      bagian: session.mode === 'review' ? 'flashcard' : 'latihan',
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
    } catch (error) {
      setSaveState('error');
      setSaveMessage(error instanceof Error ? error.message : String(error));
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)) return;
      const key = event.key.toLowerCase();
      if (!done && (key === 's' || key === 'o' || event.key === ' ' || event.key === 'ArrowDown')) {
        event.preventDefault();
        setFlipped((value) => !value);
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
  }, [done, flipped, grade]);

  if (total === 0) {
    return (
      <div className="panel fade-in result-panel">
        <div className="crumbs">{session.lesson.label}</div>
        <div className="result-stamp">0</div>
        <h2>Tidak ada kartu yang perlu direview.</h2>
        <p className="result-sub">
          {formatNextDue(session.nextDueAt)
            ? `Review berikutnya: ${formatNextDue(session.nextDueAt)} WITA`
            : 'Belum ada kartu terjadwal.'}
        </p>
        <div className="action-row"><Link className="btn-primary" href="/courses">Kembali ke Kursus</Link></div>
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

  return (
    <div className="panel fade-in quiz-panel">
      <div className="crumbs">{session.lesson.label} <span>›</span> {session.mode === 'review' ? 'Review FSRS' : 'Latihan Flashcard'}</div>
      <div className="progress-row">
        <div className="progress-track"><div className="progress-fill" style={{ width: `${(index / total) * 100}%` }} /></div>
        <span className="progress-label">{index + 1} / {total}</span>
      </div>

      <div className="flashcard-wrap">
        <button
          type="button"
          className={`flashcard-card ${flipped ? 'grid-layout' : ''}`}
          onClick={() => setFlipped((value) => !value)}
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

        <div className="action-row"><Link className="btn-ghost" href="/courses">Keluar Sesi</Link></div>
      </div>
    </div>
  );
}
