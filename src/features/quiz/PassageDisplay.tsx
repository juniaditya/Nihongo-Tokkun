import type { QuizPassage } from "@/lib/quizTypes";
import { TtsButton } from '@/components/TtsButton';

interface PassageDisplayProps {
  passage: QuizPassage;
}

export function PassageDisplay({ passage }: PassageDisplayProps) {
  const isTwo = passage.passageType === "two";
  const speechText = [passage.textA, passage.textB].filter(Boolean).join('。');

  return (
    <div className="mb-6 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-widest font-bold text-violet-400">
          Teks Bacaan
        </p>
        <TtsButton text={speechText} label="Dengarkan bacaan" className="tts-action-button-compact" />
      </div>

      {isTwo ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-white/[0.03] border border-white/10 p-4">
            <p className="text-xs text-slate-500 mb-2">Teks A</p>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap" lang="ja">
              {passage.textA}
            </p>
          </div>
          {passage.textB && (
            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-4">
              <p className="text-xs text-slate-500 mb-2">Teks B</p>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap" lang="ja">
                {passage.textB}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap" lang="ja">
          {passage.textA}
        </p>
      )}
    </div>
  );
}
