import React from 'react';

interface QuestionCardProps {
  questionNumber: number;
  questionText: string;
}

export function QuestionCard({
  questionNumber,
  questionText,
}: QuestionCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 backdrop-blur-md shadow-glass-sm transition-all">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-400">
          Soal {questionNumber}
        </span>
      </div>

      <div className="font-japanese text-xl md:text-2xl font-bold leading-relaxed text-foreground tracking-wide select-text">
        {questionText}
      </div>
    </div>
  );
}
