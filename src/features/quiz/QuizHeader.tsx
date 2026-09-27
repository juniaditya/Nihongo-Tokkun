import { LogOut, X } from "lucide-react";

interface QuizHeaderProps {
  categoryLabel: string;
  lessonLabel: string;
  accentClass: string;
  /** 'pre' = before quiz starts (no exit guard needed), 'active' = quiz in progress */
  phase: "pre" | "active" | "done";
  onExitRequest: () => void;
}

export function QuizHeader({
  categoryLabel,
  lessonLabel,
  accentClass,
  phase,
  onExitRequest,
}: QuizHeaderProps) {
  if (phase === "done") return null;

  return (
    <div className="quiz-top-nav">
      {phase === "active" ? (
        <button
          id="quiz-exit-btn"
          type="button"
          onClick={onExitRequest}
          aria-label="Keluar dari latihan"
          className="btn-back"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Keluar Latihan
        </button>
      ) : (
        <a
          href="/courses"
          aria-label="Kembali ke daftar pelajaran"
          className="btn-back"
        >
          <X className="w-4 h-4" aria-hidden="true" />
          Kembali
        </a>
      )}

      <div className="crumbs !mb-0 min-w-0">
        <span className={accentClass}>{categoryLabel}</span>
        <span>›</span>
        <span>{lessonLabel}</span>
      </div>
    </div>
  );
}
