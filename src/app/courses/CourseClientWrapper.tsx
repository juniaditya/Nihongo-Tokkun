"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpenCheck, Dice5, Layers3, LockKeyhole, RotateCcw, Languages, Mic, Info, Link2, Split, MessageSquare } from "lucide-react";
import type { LearningSummary, LessonSummary, ReviewQueueSummary } from "@/lib/types";

type Tab = "semua" | "kotoba" | "bunpou" | "dokkai";

const BUNPOU_SECTIONS = [
  { key: "arti_fungsi", label: "Arti & Fungsi", icon: Info },
  { key: "bentuk_koneksi", label: "Bentuk & Koneksi", icon: Link2 },
  { key: "perbedaan_grammar", label: "Perbedaan Grammar Mirip", icon: Split },
  { key: "penggunaan_kalimat", label: "Penggunaan dalam Kalimat", icon: MessageSquare },
] as const;

const KOTOBA_MIXED = [
  { key: "penggunaan", label: "Penggunaan dalam Kalimat" },
  { key: "yohou", label: "用法" },
  { key: "ruigigo", label: "類義語・使い分け" },
] as const;

function best(learning: LearningSummary, lesson: LessonSummary, section: string): number | null {
  const v = learning.completion.byDayBagian[`${lesson.category}|${lesson.dayNumber}|${section}`]?.bestScore;
  return v == null ? null : Number(v);
}

function flashBest(learning: LearningSummary, lesson: LessonSummary): number | null {
  const v = learning.completion.byFlashcardUnit[`${lesson.category}|${lesson.dayNumber}`]?.bestScore;
  return v == null ? null : Number(v);
}

function scoreClass(score: number | null) {
  if (score == null) return "score-neutral";
  return score >= 90 ? "score-success" : "score-needs-work";
}

function Score({ value }: { value: number | null }) {
  if (value == null) return null;
  return <span className={`sb-best score-value ${scoreClass(value)}`}>{value}%</span>;
}

function mixedBest(learning: LearningSummary, lesson: LessonSummary): number | null {
  const direct = best(learning, lesson, "mixed");
  if (direct != null) return direct;
  const legacy = KOTOBA_MIXED.map((s) => best(learning, lesson, s.key));
  const present = legacy.filter((v): v is number => v != null);
  if (!present.length) return null;
  // Historical Apps Script progress stored the three mixed components separately.
  // Display the weakest component so a 90% badge still means every component passed.
  return Math.min(...present);
}

function mixedPassed(learning: LearningSummary, lesson: LessonSummary): boolean {
  const direct = best(learning, lesson, "mixed");
  if (direct != null) return direct >= 90;
  const legacy = KOTOBA_MIXED.map((s) => best(learning, lesson, s.key));
  return legacy.every((v) => (v ?? -1) >= 90);
}

function lessonStatus(lesson: LessonSummary, learning: LearningSummary) {
  if (lesson.category === "kotoba") {
    const arti = best(learning, lesson, "arti");
    const reading = best(learning, lesson, "cara_baca");
    const mixed = mixedBest(learning, lesson);
    const values = [arti, reading, mixed];
    if (values.every((v) => v == null)) return { cls: "status-notstarted", label: "⚪ Not Started" };
    return (arti ?? -1) >= 90 && (reading ?? -1) >= 90 && mixedPassed(learning, lesson)
      ? { cls: "status-mastered", label: "🟢 Mastered" }
      : { cls: "status-needswork", label: "🔴 Needs Work" };
  }
  if (lesson.category === "dokkai") {
    const score = best(learning, lesson, "sesi");
    if (score == null) return { cls: "status-notstarted", label: "⚪ Not Started" };
    return score >= 90 ? { cls: "status-mastered", label: "🟢 Mastered" } : { cls: "status-needswork", label: "🔴 Needs Work" };
  }
  const values = BUNPOU_SECTIONS.map((s) => best(learning, lesson, s.key));
  const fc = flashBest(learning, lesson);
  if (fc != null) values.push(fc);
  const present = values.filter((v): v is number => v != null);
  if (!present.length) return { cls: "status-notstarted", label: "⚪ Not Started" };
  const avg = Math.round(present.reduce((a, b) => a + b, 0) / present.length);
  return avg >= 90 ? { cls: "status-mastered", label: "🟢 Mastered" } : { cls: "status-needswork", label: "🔴 Needs Work" };
}

export default function CourseClientWrapper({
  lessons,
  learning,
  reviewQueue,
}: {
  lessons: LessonSummary[];
  learning: LearningSummary;
  reviewQueue: ReviewQueueSummary;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("semua");
  const filtered = activeTab === "semua" ? lessons : lessons.filter((l) => l.category === activeTab);

  return (
    <div className="panel fade-in">
      <div className="chart-card review-course-card">
        <div className="review-course-head">
          <h3><RotateCcw size={17} /> Review Kotoba</h3>
          <p className="muted">{reviewQueue.dueCount ? `${reviewQueue.dueCount} kartu perlu direview` : "Tidak ada kotoba yang perlu direview sekarang."}</p>
        </div>
        <div className="review-stat-chips">
          <span className="review-stat-chip">Due <strong>{reviewQueue.dueCount}</strong></span>
          <span className="review-stat-chip">Recall antrean <strong>{reviewQueue.recallRate == null ? "—" : `${reviewQueue.recallRate}%`}</strong></span>
          <span className="review-stat-chip">Total review <strong>{reviewQueue.totalReviewCount}</strong></span>
        </div>
        <p className="review-priority">Prioritas: kartu yang paling dulu jatuh tempo</p>
        {reviewQueue.dueCount > 0 ? (
          <Link className="btn-primary inline-flex justify-center" href="/review">Mulai Review</Link>
        ) : (
          <button className="btn-primary" disabled>Mulai Review</button>
        )}
      </div>

      <div className="course-header-row">
        <div>
          <h2 className="panel-title" style={{ marginBottom: 4 }}>📚 Kursus</h2>
          <p className="muted">Pilih kategori dan latihan yang ingin dikerjakan.</p>
        </div>
        <div className="category-tab-bar">
          {([['semua', 'Semua'], ['kotoba', '語 Kotoba'], ['bunpou', '法 Bunpou'], ['dokkai', '読 Dokkai']] as Array<[Tab, string]>).map(([key, label]) => (
            <button key={key} className={`cat-tab-btn ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="lesson-cards-grid">
        {filtered.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} learning={learning} />
        ))}
      </div>
    </div>
  );
}

function LessonCard({ lesson, learning }: { lesson: LessonSummary; learning: LearningSummary }) {
  const status = lessonStatus(lesson, learning);
  const title = `${lesson.category === 'kotoba' ? '語' : lesson.category === 'bunpou' ? '法' : '読'} ${lesson.category === 'kotoba' ? 'Kotoba' : lesson.category === 'bunpou' ? 'Bunpou' : 'Dokkai'} — Hari ke-${lesson.dayNumber}`;
  const categoryLabel = lesson.category === 'kotoba' ? '言葉 Kotoba' : lesson.category === 'bunpou' ? '文法 Bunpou' : '読解 Dokkai';

  return (
    <div className="lesson-card fade-in">
      <div className="lesson-card-header">
        <div>
          <div className="lesson-card-title">{title}</div>
          <span className="lesson-card-category">{categoryLabel}</span>
        </div>
        <span className={`lesson-status-badge ${status.cls}`}>{status.label}</span>
      </div>

      <div className="lesson-actions-stack">
        {lesson.category === 'kotoba' && <KotobaActions lesson={lesson} learning={learning} />}
        {lesson.category === 'bunpou' && <BunpouActions lesson={lesson} learning={learning} />}
        {lesson.category === 'dokkai' && <DokkaiActions lesson={lesson} learning={learning} />}
      </div>

      <div className="lesson-card-foot">
        <Link href={`/lessons/${lesson.id}`} className="lesson-detail-link">Lihat detail materi →</Link>
      </div>
    </div>
  );
}

function KotobaActions({ lesson, learning }: { lesson: LessonSummary; learning: LearningSummary }) {
  const flash = flashBest(learning, lesson);
  const arti = best(learning, lesson, 'arti');
  const reading = best(learning, lesson, 'cara_baca');
  const mixed = mixedBest(learning, lesson);
  const mixedUnlocked = (arti ?? -1) >= 90 && (reading ?? -1) >= 90;

  return (
    <>
      <ActionLink href={`/flashcards/${lesson.id}`} filled={lesson.flashcardCount > 0} icon={<Layers3 size={15} />} label="Latihan (Flashcard)" score={flash} />
      <ActionLink href={`/quiz/${lesson.id}?section=arti`} filled={lesson.questionCount > 0} icon={<Languages size={15} />} label="Arti" score={arti} />
      <ActionLink href={`/quiz/${lesson.id}?section=cara_baca`} filled={lesson.questionCount > 0} icon={<Mic size={15} />} label="Cara Baca" score={reading} />

      <div className="mixed-action-row">
        {mixedUnlocked ? (
          <Link className="subbab-pill filled" href={`/quiz/${lesson.id}?mode=mixed`}>
            <span className="sb-label inline-flex items-center gap-1.5"><Dice5 size={15} />Latihan Campuran</span>
            <Score value={mixed} />
          </Link>
        ) : (
          <div className="subbab-pill mixed-action-disabled" aria-disabled="true">
            <span className="sb-label inline-flex items-center gap-1.5"><LockKeyhole size={15} />Latihan Campuran</span>
            <Score value={mixed} />
          </div>
        )}
        <p className="mixed-action-rule">30 soal · Syarat: Arti &amp; Cara Baca masing-masing minimal 90%</p>
      </div>
    </>
  );
}

function BunpouActions({ lesson, learning }: { lesson: LessonSummary; learning: LearningSummary }) {
  return (
    <>
      {BUNPOU_SECTIONS.map(({ key, label, icon: Icon }) => (
        <ActionLink key={key} href={`/quiz/${lesson.id}?section=${key}`} filled={lesson.questionCount > 0} icon={<Icon size={15} />} label={label} score={best(learning, lesson, key)} />
      ))}
      <ActionLink href={`/flashcards/${lesson.id}`} filled={lesson.flashcardCount > 0} icon={<Layers3 size={15} />} label="Latihan (Flashcard)" score={flashBest(learning, lesson)} />
    </>
  );
}

function DokkaiActions({ lesson, learning }: { lesson: LessonSummary; learning: LearningSummary }) {
  const value = best(learning, lesson, 'sesi');
  return <ActionLink href={`/quiz/${lesson.id}`} filled={lesson.questionCount > 0} icon={<BookOpenCheck size={15} />} label="Sesi Membaca (5 Section)" score={value} />;
}

function ActionLink({ href, filled, icon, label, score }: { href: string; filled: boolean; icon: React.ReactNode; label: string; score: number | null }) {
  return (
    <Link className={`subbab-pill ${filled ? 'filled' : ''}`} href={href}>
      <span className="sb-label inline-flex items-center gap-1.5">{icon}{label}</span>
      <Score value={score} />
    </Link>
  );
}
