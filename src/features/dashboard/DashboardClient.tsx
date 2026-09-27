"use client";

import { useMemo, useState } from "react";
import { Award, CalendarDays, Clock3, Layers3, Zap, X } from "lucide-react";
import type { DashboardSummary, DailyActivity, LearningCategory } from "@/lib/types";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const WRONG_REASON_LABELS: Record<string, string> = {
  lupa_arti: "Lupa artinya",
  tidak_ngerti: "Tidak mengerti soal/bacaan",
  buru_buru: "Terburu-buru / salah klik",
  terkecoh: "Terkecoh pilihan lain",
  terkecoh_pilihan: "Terkecoh pilihan lain",
  salah_baca: "Salah baca soal",
  lainnya: "Lainnya",
};

const CATEGORY_META: Record<LearningCategory, { icon: string; label: string }> = {
  kotoba: { icon: "語", label: "言葉 Kotoba" },
  bunpou: { icon: "法", label: "文法 Bunpou" },
  dokkai: { icon: "読", label: "読解 Dokkai" },
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m ? `${h}j ${m}m` : `${h}j`;
}

function isoLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysUntilExam(): number {
  const exam = new Date(2026, 11, 6);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((exam.getTime() - today.getTime()) / 86400000));
}

export function DashboardClient({ summary }: { summary: DashboardSummary }) {
  const now = new Date();
  const [calendarCursor, setCalendarCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<DailyActivity | null>(null);

  const calendarCells = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const first = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; key?: string; activity?: DailyActivity }> = [];
    for (let i = 0; i < first; i += 1) cells.push({ day: null });
    for (let d = 1; d <= count; d += 1) {
      const key = isoLocalDate(new Date(year, month, d));
      cells.push({ day: d, key, activity: summary.dailyActivity[key] });
    }
    return cells;
  }, [calendarCursor, summary.dailyActivity]);

  return (
    <div className="panel fade-in">
      <h2 className="panel-title">📊 Dashboard</h2>

      <div className="countdown-card">
        <div className="countdown-title">🎯 Target JLPT N2</div>
        <div className="countdown-days">
          {daysUntilExam()} <span style={{ fontSize: 18, fontWeight: 400 }}>hari lagi</span>
        </div>
        <div className="countdown-sub">Ujian JLPT N2 — 6 Desember 2026</div>
      </div>

      <div className="metrics-grid dashboard-metrics">
        <Metric label="Streak" value={`${summary.overview.currentStreak} Hari`} icon={<Zap size={18} />} />
        <Metric label="Waktu Belajar" value={formatDuration(summary.overview.totalStudyDurationMs)} icon={<Clock3 size={18} />} />
        <Metric label="Akurasi" value={`${summary.overview.overallAccuracy}%`} icon={<Award size={18} />} />
        <Metric label="Kartu Di-review" value={summary.overview.totalFlashcardReviews.toLocaleString("id-ID")} icon={<Layers3 size={18} />} />
      </div>

      <div className="activity-calendar-card" style={{ marginBottom: 20 }}>
        <div className="calendar-header">
          <h3 className="dashboard-section-title"><CalendarDays size={17} /> Activity Calendar</h3>
          <div className="cal-month-nav">
            <button className="btn-ghost" onClick={() => setCalendarCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹ Prev</button>
            <span className="calendar-month-label">{MONTHS[calendarCursor.getMonth()]} {calendarCursor.getFullYear()}</span>
            <button className="btn-ghost" onClick={() => setCalendarCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>Next ›</button>
          </div>
        </div>
        <div className="calendar-grid">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((x) => <div className="cal-day-head" key={x}>{x}</div>)}
          {calendarCells.map((cell, index) => {
            if (cell.day == null) return <div className="cal-day-cell empty" key={`empty-${index}`} />;
            const ops = (cell.activity?.questionsAnswered ?? 0) + (cell.activity?.flashcardReviews ?? 0);
            const level = ops > 20 ? "cal-level-3" : ops > 5 ? "cal-level-2" : ops > 0 ? "cal-level-1" : "";
            return (
              <button
                type="button"
                key={cell.key}
                className={`cal-day-cell ${level}`}
                disabled={!cell.activity}
                onClick={() => cell.activity && setSelectedDay(cell.activity)}
              >
                <span className="cal-date-num">{cell.day}</span>
                {cell.activity && <span className="cal-time">{formatDuration(cell.activity.studyTimeMs)}</span>}
                {ops > 0 && <span className="cal-badge">{ops} Q</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 20, paddingBottom: 14 }}>
        <h3 className="dashboard-section-title"><Award size={17} /> Category Unit Mastery (≥ 90% Score)</h3>
        <div className="mastery-list">
          {(Object.keys(CATEGORY_META) as LearningCategory[]).map((cat) => {
            const m = summary.categoryMastery[cat];
            return (
              <div key={cat}>
                <div className="mastery-head">
                  <span><strong>{CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}</strong> — {m.mastered} / {m.total} unit tuntas</span>
                  <span className="mastery-pct">{m.percent}%</span>
                </div>
                <div className="mastery-track"><div className="mastery-fill" style={{ width: `${m.percent}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="chart-card dashboard-performance-card" style={{ marginBottom: 20, paddingBottom: 14 }}>
        <h3 className="dashboard-section-title primary-title"><Zap size={17} /> Learning Performance & Wrong Reasons</h3>
        <div className="stat-row" style={{ marginTop: 10, marginBottom: 10 }}>
          <div className="stat"><span className="stat-icon">⏱️</span><div><span className="stat-num">{formatDuration(summary.overview.avgResponseTimeMs)}</span><span className="stat-label">Rata-rata Respon Soal</span></div></div>
          <div className="stat"><span className="stat-icon">📇</span><div><span className="stat-num">{summary.overview.flashcardGoodRate}%</span><span className="stat-label">Flashcard Good Rate</span></div></div>
          <div className="stat"><span className="stat-icon">📚</span><div><span className="stat-num">{summary.overview.totalActiveDays}</span><span className="stat-label">Hari Aktif</span></div></div>
        </div>
        {summary.wrongReasons.length > 0 && (
          <div className="wrong-reason-wrap">
            <h4>Analisis Alasan Salah</h4>
            <div className="wrong-reason-chips">
              {summary.wrongReasons.map((wr) => (
                <span className="wrong-reason-chip" key={wr.reason}>
                  <strong>{WRONG_REASON_LABELS[wr.reason] ?? wr.reason}</strong>: {wr.count}x ({wr.percentage}%)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="chart-card" style={{ marginBottom: 20, paddingBottom: 14 }}>
        <h3>⚠️ Soal yang Sering Salah</h3>
        {summary.hardQuestions.length ? (
          <div className="hard-list">
            {summary.hardQuestions.slice(0, 10).map((hq) => (
              <div className="hard-row" key={hq.questionId}>
                <span className="hard-pct dashboard-hard-red">{100 - hq.accuracy}% salah</span>
                <div className="hard-info">
                  <p className="hard-q">{hq.questionText}</p>
                  <span className="hard-meta">{hq.kategori} {hq.nomor} · {hq.bagian} · {hq.attempts}x dicoba · Akurasi {hq.accuracy}% · {formatDuration(hq.avgResponseTimeMs)}/soal</span>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="muted">Belum ada soal yang memenuhi kriteria sulit (minimal 2 percobaan).</p>}
      </div>

      <div className="chart-card" style={{ marginBottom: 20, paddingBottom: 14 }}>
        <h3>⚠️ Kata Flashcard Susah Dihafal</h3>
        {summary.hardFlashcards.length ? (
          <div className="hard-list">
            {summary.hardFlashcards.slice(0, 10).map((hc) => (
              <div className="hard-row" key={hc.cardId}>
                <span className="hard-pct dashboard-hard-amber">{100 - hc.goodRate}% again</span>
                <div className="hard-info">
                  <p className="hard-q">{hc.front}{hc.reading ? <span className="hard-reading"> ({hc.reading})</span> : null}</p>
                  {hc.meaning ? <p className="hard-meaning">{hc.meaning}</p> : null}
                  <span className="hard-meta">{hc.kategori} {hc.nomor} · Good {hc.goodRate}% · {hc.again}x Again dari {hc.reviews}x review</span>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="muted">Belum ada kata flashcard yang memenuhi kriteria susah dihafal.</p>}
      </div>

      <div className="chart-card" style={{ paddingBottom: 14 }}>
        <h3>📜 Combined Recent Activity Stream</h3>
        <div className="history-table">
          {summary.recentAttempts.length ? summary.recentAttempts.map((h) => (
            <div className="hist-row" key={`${h.type}-${h.attemptId}`}>
              <span className="hist-date">{String(h.completedAt ?? '').slice(0, 10)}</span>
              <span className="hist-day">{h.kategori} {h.nomor}</span>
              <span className="hist-bagian">{h.type === 'flashcard' ? 'Latihan Flashcard' : h.bagian} · {formatDuration(h.durationMs)}</span>
              <span className="hist-score">{h.score}%</span>
            </div>
          )) : <p className="muted">Belum ada riwayat aktivitas.</p>}
        </div>
      </div>

      {selectedDay && (
        <div className="modal-overlay fade-in" onClick={() => setSelectedDay(null)}>
          <div className="modal-card panel activity-modal" onClick={(e) => e.stopPropagation()}>
            <div className="activity-modal-head">
              <h3>📅 Activity Detail — {selectedDay.date}</h3>
              <button className="btn-ghost icon-only" onClick={() => setSelectedDay(null)} aria-label="Tutup"><X size={17} /></button>
            </div>
            <div className="activity-modal-grid">
              <MiniStat label="Waktu Belajar" value={formatDuration(selectedDay.studyTimeMs)} icon={<Clock3 size={16} />} />
              <MiniStat label="Quiz" value={`${selectedDay.quizAttempts} sesi`} />
              <MiniStat label="Soal" value={`${selectedDay.questionsAnswered}`} />
              <MiniStat label="Benar / Salah" value={`${selectedDay.correctAnswers} / ${selectedDay.wrongAnswers}`} />
              <MiniStat label="Flashcard" value={`${selectedDay.flashcardAttempts} sesi`} />
              <MiniStat label="Review Kartu" value={`${selectedDay.flashcardReviews}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="metric dashboard-metric-card">
      <div className="dashboard-metric-icon">{icon}</div>
      <div><div className="metric-label">{label}</div><div className="metric-value">{value}</div></div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="activity-mini-stat"><span>{icon}{label}</span><strong>{value}</strong></div>;
}
