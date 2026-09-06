import React, { useState } from 'react';
import { Tag, Check, Loader2, MessageSquarePlus } from 'lucide-react';

export interface MistakePreset {
  id: string;
  label: string;
}

interface MistakeLoggerProps {
  attemptId: string;
  presets: MistakePreset[];
  initialReason?: string;
  initialCustomReason?: string;
  onLogReason: (attemptId: string, reason: string, customReason?: string) => Promise<boolean>;
}

export function MistakeLogger({
  attemptId,
  presets,
  initialReason,
  initialCustomReason,
  onLogReason,
}: MistakeLoggerProps) {
  const [selectedReason, setSelectedReason] = useState<string>(initialReason ?? '');
  const [customText, setCustomText] = useState<string>(initialCustomReason ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(!!initialReason);

  const handleSelectPreset = async (label: string) => {
    setSelectedReason(label);
    setSavedSuccess(false);

    if (label !== 'Lainnya') {
      setIsSaving(true);
      const ok = await onLogReason(attemptId, label);
      setIsSaving(false);
      if (ok) setSavedSuccess(true);
    }
  };

  const handleSaveCustom = async () => {
    if (!customText.trim()) return;
    setIsSaving(true);
    setSavedSuccess(false);
    const ok = await onLogReason(attemptId, 'Lainnya', customText.trim());
    setIsSaving(false);
    if (ok) setSavedSuccess(true);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Tag className="h-3.5 w-3.5 text-secondary-400" />
          <span>Catat Alasan Kesalahan (Opsional)</span>
        </div>

        {isSaving && (
          <div className="flex items-center gap-1.5 text-xs text-primary-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Menyimpan...</span>
          </div>
        )}

        {savedSuccess && !isSaving && (
          <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <Check className="h-3.5 w-3.5" />
            <span>Tersimpan</span>
          </div>
        )}
      </div>

      {/* Preset pills */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isSelected = selectedReason === preset.label;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.label)}
              disabled={isSaving}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? 'border-secondary-500 bg-secondary-500/20 text-secondary-200 ring-1 ring-secondary-500'
                  : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground'
              }`}
            >
              {preset.label}
            </button>
          );
        })}

        {/* 'Lainnya' Option */}
        <button
          type="button"
          onClick={() => handleSelectPreset('Lainnya')}
          disabled={isSaving}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
            selectedReason === 'Lainnya'
              ? 'border-secondary-500 bg-secondary-500/20 text-secondary-200 ring-1 ring-secondary-500'
              : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground'
          }`}
        >
          Lainnya...
        </button>
      </div>

      {/* Custom Reason Input */}
      {selectedReason === 'Lainnya' && (
        <div className="pt-2 space-y-2">
          <textarea
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              setSavedSuccess(false);
            }}
            placeholder="Tuliskan catatan alasan kesalahan Anda..."
            maxLength={500}
            rows={2}
            className="w-full rounded-lg border border-white/15 bg-white/5 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {customText.length}/500 karakter
            </span>
            <button
              type="button"
              onClick={handleSaveCustom}
              disabled={isSaving || !customText.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-500 px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Simpan Catatan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
