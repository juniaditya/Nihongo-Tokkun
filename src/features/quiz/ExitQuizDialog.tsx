"use client";

import { useEffect, useRef } from "react";

interface ExitQuizDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExitQuizDialog({ open, onCancel, onConfirm }: ExitQuizDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus "Batal" (safe default) when dialog opens
  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  // Escape key = Batal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-dialog-title"
      aria-describedby="exit-dialog-desc"
      onClick={(e) => {
        // Close on backdrop click (= Batal)
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0d0f1e] p-6 shadow-2xl">
        <h2
          id="exit-dialog-title"
          className="text-lg font-extrabold text-white mb-2"
        >
          Keluar dari latihan?
        </h2>
        <p
          id="exit-dialog-desc"
          className="text-sm text-slate-400 leading-relaxed mb-6"
        >
          Latihan ini belum selesai. Progres yang belum disimpan akan hilang
          jika Anda keluar sekarang.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            id="exit-dialog-cancel"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 border border-white/15
                       hover:border-white/30 hover:text-white transition-all
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            Batal
          </button>
          <button
            id="exit-dialog-confirm"
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-red-300 border border-red-500/30
                       hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-200 transition-all
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
