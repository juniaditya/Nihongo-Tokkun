interface QuizProgressProps {
  current: number;  // 1-based
  total: number;
  correct: number;
}

export function QuizProgress({ current, total, correct }: QuizProgressProps) {
  const pct = total > 0 ? Math.round(((current - 1) / total) * 100) : 0;

  return (
    <div className="mb-6" role="status" aria-label={`Soal ${current} dari ${total}`}>
      <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
        <span>
          Soal <span className="text-white font-bold tabular-nums">{current}</span>
          {" "}/ {total}
        </span>
        <span>
          Benar: <span className="text-teal-400 font-bold tabular-nums">{correct}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
