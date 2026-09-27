import Link from 'next/link';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface QuizResultProps {
  lessonId: string;
  lessonLabel: string;
  correct: number;
  total: number;
  onRetry: () => void;
  saveState: SaveState;
  saveMessage: string;
  onRetrySave: () => void;
  serverScore?: number | null;
}

export function QuizResult({
  lessonId,
  lessonLabel,
  correct,
  total,
  onRetry,
  saveState,
  saveMessage,
  onRetrySave,
  serverScore,
}: QuizResultProps) {
  const localPct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const pct = serverScore ?? localPct;
  const grade =
    pct >= 90
      ? { label: 'Sempurna!', tone: 'success' }
      : pct >= 70
      ? { label: 'Bagus!', tone: 'good' }
      : pct >= 50
      ? { label: 'Cukup', tone: 'warn' }
      : { label: 'Perlu Latihan', tone: 'danger' };

  return (
    <div className="result-panel-inner">
      <div className={`result-score-ring result-tone-${grade.tone}`}>
        <span className="result-score-value">{pct}%</span>
        <span className="result-score-count">{correct} / {total}</span>
      </div>
      <p className={`result-grade result-tone-${grade.tone}`}>{grade.label}</p>
      <p className="result-sub">{lessonLabel}</p>

      <p className={`save-note ${saveState === 'error' ? 'err' : ''}`}>
        {saveMessage || (saveState === 'saving' ? 'Menyimpan progress ke Supabase...' : 'Menyiapkan hasil...')}
      </p>
      {saveState === 'error' && (
        <button className="btn-primary" type="button" onClick={onRetrySave}>Coba Simpan Lagi</button>
      )}

      <div className="action-row">
        <button id="quiz-result-retry" type="button" onClick={onRetry} className="btn-primary">↻ Ulangi Latihan</button>
        <Link id="quiz-result-back" href="/courses" className="btn-ghost">← Kembali ke Kursus</Link>
        <Link href={`/lessons/${lessonId}`} className="btn-ghost">Lihat Pelajaran</Link>
      </div>
    </div>
  );
}
