import React from 'react';
import { Check, X } from 'lucide-react';

interface OptionCardProps {
  id: string;
  optionIndex: number;
  optionText: string;
  isSelected: boolean;
  isDisabled: boolean;
  isSubmitted: boolean;
  isCorrect?: boolean;
  isAuthoritativeSelected?: boolean;
  onSelect: (id: string) => void;
}

export function OptionCard({
  id,
  optionIndex,
  optionText,
  isSelected,
  isDisabled,
  isSubmitted,
  isCorrect,
  isAuthoritativeSelected,
  onSelect,
}: OptionCardProps) {
  const optionLabels = ['1', '2', '3', '4'];
  const label = optionLabels[optionIndex] ?? `${optionIndex + 1}`;

  // Styling calculation
  let containerStyle = 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8 text-foreground';
  let badgeStyle = 'border-white/15 bg-white/10 text-muted-foreground';

  if (!isSubmitted) {
    if (isSelected) {
      containerStyle = 'border-primary-500 bg-primary-500/15 shadow-glow text-white ring-2 ring-primary-500/50';
      badgeStyle = 'border-primary-500 bg-primary-500 text-white font-bold';
    }
  } else {
    if (isCorrect) {
      // Correct Option
      containerStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-100 ring-2 ring-emerald-500/50';
      badgeStyle = 'border-emerald-500 bg-emerald-500 text-white font-bold';
    } else if (isAuthoritativeSelected && !isCorrect) {
      // Selected but incorrect
      containerStyle = 'border-red-500 bg-red-500/15 text-red-100 ring-2 ring-red-500/50';
      badgeStyle = 'border-red-500 bg-red-500 text-white font-bold';
    } else {
      // Other non-selected options
      containerStyle = 'border-white/5 bg-white/2 text-muted-foreground opacity-60';
      badgeStyle = 'border-white/10 bg-white/5 text-muted-foreground';
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (!isDisabled && !isSubmitted) {
          onSelect(id);
        }
      }}
      disabled={isDisabled || isSubmitted}
      aria-pressed={isSelected}
      className={`group relative flex w-full items-center gap-4 rounded-xl border p-4 text-left backdrop-blur-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${containerStyle} ${
        isDisabled || isSubmitted ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      {/* Option number / Icon badge */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs transition-all ${badgeStyle}`}
      >
        {isSubmitted && isCorrect ? (
          <Check className="h-4 w-4 stroke-[3]" />
        ) : isSubmitted && isAuthoritativeSelected && !isCorrect ? (
          <X className="h-4 w-4 stroke-[3]" />
        ) : (
          label
        )}
      </div>

      {/* Option Text */}
      <span className="flex-1 font-japanese text-base md:text-lg font-medium leading-relaxed">
        {optionText}
      </span>

      {/* Post-submission indicator label */}
      {isSubmitted && (
        <span className="shrink-0 text-xs font-semibold">
          {isCorrect && <span className="text-emerald-400">Jawaban Benar</span>}
          {isAuthoritativeSelected && !isCorrect && (
            <span className="text-red-400">Pilihan Anda</span>
          )}
        </span>
      )}
    </button>
  );
}
