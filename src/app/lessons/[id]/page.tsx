import { getLessonById } from '@/server/supabase/content';
import { getLessonAnalysis } from '@/server/supabase/lessonAnalysis';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Brain,
  Clock3,
  History,
  Layers3,
  Play,
  Target,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const WRONG_REASON_LABELS: Record<string, string> = {
  lupa_arti: 'Lupa artinya',
  tidak_ngerti: 'Tidak mengerti soal/bacaan',
  buru_buru: 'Terburu-buru / salah klik',
  terkecoh: 'Terkecoh pilihan lain',
  terkecoh_pilihan: 'Terkecoh pilihan lain',
  salah_baca: 'Salah baca soal',
  lainnya: 'Lainnya',
};

function scoreClass(score: number | null) {
  if (score == null) return 'score-neutral';
  return score >= 90 ? 'score-success' : 'score-needs-work';
}

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  if (seconds < 60) return `${seconds}d`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}j ${rest}m` : `${hours}j`;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = await getLessonById(id);
  if (!lesson) notFound();
  const analysis = await getLessonAnalysis(lesson);

  const categoryLabel = lesson.category === 'kotoba' ? '言葉 Kotoba' : lesson.category === 'bunpou' ? '文法 Bunpou' : '読解 Dokkai';
  const categorySymbol = lesson.category === 'kotoba' ? '語' : lesson.category === 'bunpou' ? '法' : '読';

  return (
    <div className="panel fade-in lesson-detail-page">
      <div className="crumbs"><Link href="/">Dashboard</Link><span>›</span><Link href="/courses">Kursus</Link><span>›</span>{categoryLabel}</div>

      <div className="lesson-detail-hero">
        <div className="lesson-detail-symbol">{categorySymbol}</div>
        <div>
          <p className="eyebrow">{categoryLabel}</p>
          <h1 className="lesson-detail-title">{lesson.label || `${lesson.category} ${lesson.dayNumber}`}</h1>
          <p className="muted">Hari ke-{lesson.dayNumber} · progress dan analisis langsung dari Supabase</p>
        </div>
      </div>

      <div className="lesson-detail-stats">
        <StatPill label="Soal" value={lesson.questionCount} />
        <StatPill label="Flashcard" value={lesson.flashcardCount} />
        <StatPill label="Total sesi" value={analysis.overview.totalAttempts} />
        <StatPill label="Akurasi" value={analysis.overview.accuracy == null ? '—' : `${analysis.overview.accuracy}%`} />
      </div>

      <div className="lesson-detail-actions">
        {lesson.questionCount > 0 && (
          <Link href={`/quiz/${lesson.id}`} className="btn-primary inline-flex items-center gap-2"><Play size={16} /> Mulai Quiz</Link>
        )}
        {lesson.flashcardCount > 0 && lesson.category !== 'dokkai' && (
          <Link href={`/flashcards/${lesson.id}`} className="btn-ghost inline-flex items-center gap-2"><Layers3 size={16} /> Latihan Flashcard</Link>
        )}
        {lesson.category === 'kotoba' && lesson.questionCount > 0 && (
          <Link href={`/quiz/${lesson.id}?mode=mixed`} className="btn-ghost inline-flex items-center gap-2"><Target size={16} /> Latihan Campuran</Link>
        )}
        {lesson.category === 'dokkai' && lesson.questionCount > 0 && (
          <span className="lesson-detail-note"><BookOpenCheck size={15} /> Dokkai dijalankan sebagai satu sesi terintegrasi.</span>
        )}
      </div>

      <section className="lesson-analysis-section">
        <div className="lesson-section-heading">
          <div><p className="eyebrow">Progress</p><h2><BarChart3 size={18} /> Progress per Latihan</h2></div>
          <span className="lesson-rule-note">Target kelulusan ≥ 90%</span>
        </div>
        <div className="lesson-progress-grid">
          {analysis.progress.map((item) => (
            <article className="lesson-progress-card" key={item.key}>
              <div className="lesson-progress-card-top">
                <strong>{item.label}</strong>
                <span className={`lesson-progress-score ${scoreClass(item.bestScore)}`}>{item.bestScore == null ? '—' : `${item.bestScore}%`}</span>
              </div>
              <div className="lesson-progress-track"><span style={{ width: `${Math.max(0, Math.min(100, item.bestScore ?? 0))}%` }} /></div>
              <div className="lesson-progress-meta">
                <span>{item.attempts} sesi</span>
                <span>Akurasi {item.accuracy == null ? '—' : `${item.accuracy}%`}</span>
                <span>Terakhir {item.lastScore == null ? '—' : `${item.lastScore}%`}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lesson-analysis-section">
        <div className="lesson-section-heading">
          <div><p className="eyebrow">Analisis</p><h2><Brain size={18} /> Analisis Belajar</h2></div>
        </div>
        <div className="lesson-insight-grid">
          {analysis.insights.map((insight, index) => <div className="lesson-insight-card" key={`${index}-${insight}`}>{insight}</div>)}
        </div>
      </section>

      <section className="lesson-analysis-section lesson-analysis-two-col">
        <div className="lesson-analysis-card">
          <div className="lesson-section-heading compact">
            <div><p className="eyebrow">Diagnosis</p><h2><AlertTriangle size={18} /> Mengapa Jawaban Salah</h2></div>
          </div>
          {analysis.wrongReasons.length ? (
            <div className="lesson-reason-list">
              {analysis.wrongReasons.map((reason) => (
                <div className="lesson-reason-row" key={reason.reason}>
                  <div className="lesson-reason-copy"><strong>{WRONG_REASON_LABELS[reason.reason] ?? reason.reason}</strong><span>{reason.count}x · {reason.percentage}%</span></div>
                  <div className="lesson-reason-track"><span style={{ width: `${reason.percentage}%` }} /></div>
                </div>
              ))}
            </div>
          ) : <p className="muted">Belum ada alasan salah yang tercatat untuk lesson ini.</p>}
        </div>

        <div className="lesson-analysis-card">
          <div className="lesson-section-heading compact">
            <div><p className="eyebrow">Ringkasan</p><h2><Clock3 size={18} /> Statistik Lesson</h2></div>
          </div>
          <div className="lesson-summary-grid">
            <MiniStat label="Waktu belajar" value={formatDuration(analysis.overview.totalStudyDurationMs)} />
            <MiniStat label="Quiz" value={`${analysis.overview.quizAttempts} sesi`} />
            <MiniStat label="Flashcard" value={`${analysis.overview.flashcardAttempts} sesi`} />
            <MiniStat label="Jawaban salah" value={`${analysis.overview.wrongAnswers}`} />
            <MiniStat label="Akurasi quiz" value={analysis.overview.accuracy == null ? '—' : `${analysis.overview.accuracy}%`} />
            <MiniStat label="Good flashcard" value={analysis.overview.flashcardGoodRate == null ? '—' : `${analysis.overview.flashcardGoodRate}%`} />
          </div>
        </div>
      </section>

      {analysis.recentMistakes.length > 0 && (
        <section className="lesson-analysis-section">
          <div className="lesson-section-heading"><div><p className="eyebrow">Review</p><h2><AlertTriangle size={18} /> Kesalahan Terbaru</h2></div></div>
          <div className="lesson-mistake-list">
            {analysis.recentMistakes.map((mistake, index) => (
              <article className="lesson-mistake-card" key={`${mistake.questionSourceId}-${mistake.answeredAt}-${index}`}>
                <div className="lesson-mistake-head"><span>{mistake.section || 'Soal'}</span><time>{formatDate(mistake.answeredAt)}</time></div>
                <p className="lesson-mistake-question" lang="ja">{mistake.questionText}</p>
                <div className="lesson-mistake-answers">
                  <span className="mistake-answer-wrong">Jawabanmu: <strong>{mistake.selectedAnswer}</strong></span>
                  <span className="mistake-answer-correct">Benar: <strong>{mistake.correctAnswer}</strong></span>
                </div>
                {(mistake.reason || mistake.reasonOther) && <p className="lesson-mistake-reason">Alasan: {mistake.reason}{mistake.reasonOther ? ` — ${mistake.reasonOther}` : ''}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {analysis.hardQuestions.length > 0 && (
        <section className="lesson-analysis-section">
          <div className="lesson-section-heading"><div><p className="eyebrow">Prioritas</p><h2><Target size={18} /> Soal yang Perlu Diulang</h2></div></div>
          <div className="lesson-hard-list">
            {analysis.hardQuestions.map((item) => (
              <div className="lesson-hard-row" key={item.questionSourceId}>
                <span className="lesson-hard-score">{item.accuracy}%</span>
                <div><strong lang="ja">{item.questionText}</strong><p>{item.section} · salah {item.wrong}x dari {item.attempts} jawaban</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="lesson-analysis-section">
        <div className="lesson-section-heading"><div><p className="eyebrow">History</p><h2><History size={18} /> Riwayat Latihan</h2></div></div>
        {analysis.recentHistory.length ? (
          <div className="lesson-history-list">
            {analysis.recentHistory.map((item) => (
              <div className="lesson-history-row" key={`${item.type}-${item.attemptId}`}>
                <div><strong>{item.label}</strong><span>{formatDate(item.completedAt)} · {formatDuration(item.durationMs)}</span></div>
                <div className="lesson-history-result"><span>{item.correctCount}/{item.totalCount}</span><strong className={scoreClass(item.score)}>{item.score}%</strong></div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state compact-empty"><p>Belum ada history untuk lesson ini.</p></div>}
      </section>

      <div className="action-row"><Link href="/courses" className="btn-ghost">← Kembali ke Kursus</Link></div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number | string }) {
  const printable = typeof value === 'number' ? value.toLocaleString('id-ID') : value;
  return <div className="lesson-stat-pill"><strong>{printable}</strong><span>{label}</span></div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="lesson-summary-stat"><span>{label}</span><strong>{value}</strong></div>;
}
