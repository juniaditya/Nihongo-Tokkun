import type { QuizPassage } from "@/lib/quizTypes";

interface PassageDisplayProps {
  passage: QuizPassage;
}

export function PassageDisplay({ passage }: PassageDisplayProps) {
  const isTwo = passage.passageType === "two";

  return (
    <div className="mb-6 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-5">
      <p className="text-xs uppercase tracking-widest font-bold text-violet-400 mb-3">
        Teks Bacaan
      </p>

      {isTwo ? (
        /* Paired tougou (統合理解) — render two reading panels side by side on md+ */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-white/[0.03] border border-white/10 p-4">
            <p className="text-xs text-slate-500 mb-2">Teks A</p>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {passage.textA}
            </p>
          </div>
          {passage.textB && (
            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-4">
              <p className="text-xs text-slate-500 mb-2">Teks B</p>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {passage.textB}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Single passage */
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
          {passage.textA}
        </p>
      )}
    </div>
  );
}
