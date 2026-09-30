'use client';

import { useEffect, useRef } from 'react';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ReviewExitDialogProps {
  open: boolean;
  reviewed: number;
  total: number;
  saveState: SaveState;
  saveMessage: string;
  onCancel: () => void;
  onSaveAndExit: () => void;
}

export function ReviewExitDialog({
  open,
  reviewed,
  total,
  saveState,
  saveMessage,
  onCancel,
  onSaveAndExit,
}: ReviewExitDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && saveState !== 'saving') {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel, open, saveState]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-exit-title"
      aria-describedby="review-exit-description"
      onClick={(event) => {
        if (event.target === event.currentTarget && saveState !== 'saving') onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0d0f1e] p-6 shadow-2xl">
        <h2 id="review-exit-title" className="mb-2 text-lg font-extrabold text-white">
          Keluar dari Review Kotoba?
        </h2>
        <p id="review-exit-description" className="mb-3 text-sm leading-relaxed text-slate-400">
          Kamu sudah mereview <strong className="text-slate-200">{reviewed}</strong> dari {total} kartu.
          Simpan kartu yang sudah dikerjakan sebelum keluar?
        </p>
        {saveMessage && (
          <p className={`mb-5 text-xs ${saveState === 'error' ? 'text-red-300' : 'text-slate-400'}`} role={saveState === 'error' ? 'alert' : undefined}>
            {saveMessage}
          </p>
        )}
        {!saveMessage && <div className="mb-5" />}

        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={saveState === 'saving'}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSaveAndExit}
            disabled={saveState === 'saving' || reviewed === 0}
            className="rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-200 transition-all hover:border-teal-400 hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveState === 'saving' ? 'Menyimpan…' : saveState === 'error' ? 'Coba Lagi' : 'Simpan & Keluar'}
          </button>
        </div>
      </div>
    </div>
  );
}
