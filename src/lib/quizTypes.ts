// ============================================================
// Quiz-specific typed DTOs.
// These are serialized from Server Components to Client Components.
// NEVER contains raw DB row shapes or Supabase credentials.
// ============================================================

/**
 * A single answer option within a quiz question.
 *
 * SECURITY NOTE (Phase 6B.2 prototype):
 * `isCorrect` and `explanation` are included in the serialized DTO
 * for this LOCAL READ-ONLY milestone only. This app is private study.
 * The final production quiz submission architecture MUST NOT trust
 * client-reported correctness. Future: browser submits selected option
 * → server validates → server returns correctness/explanation.
 */
export interface QuizOption {
  id: string;
  optionIndex: number;
  text: string;
  isCorrect: boolean;
  explanation: string | null;
}

/** A single quiz question with its ordered options. */
export interface QuizQuestion {
  id: string;
  sourceId: string;
  prompt: string;
  /** null for Kotoba/Bunpou; passage source_id for Dokkai */
  passageSourceId: string | null;
  section: string;
  questionIndex: number;
  /** Options are randomized for display; optionIndex preserves original source order/identity. */
  options: QuizOption[];
}

/** A Dokkai reading passage. */
export interface QuizPassage {
  id: string;
  sourceId: string;
  /** 'single' = one text, 'two' = paired tougou texts */
  passageType: 'single' | 'two';
  textA: string;
  textB: string | null;
}

/**
 * Complete quiz session payload.
 * Passed from Server Component → QuizShell client component.
 * Session progress is client-side while the server validates and persists the final attempt.
 */
export interface QuizSessionData {
  lesson: {
    id: string;
    category: 'kotoba' | 'bunpou' | 'dokkai';
    lessonNumber: number;
    label: string;
  };
  /** The quiz section (e.g. 'arti', 'cara_baca', 'tanbun') — null = all sections */
  section: string | null;
  /** Special selection mode. Mixed preserves original source IDs but selects 10/10/10. */
  mode: 'mixed' | null;
  /** All available sections in this lesson (derived from questions) */
  availableSections: string[];
  /** Questions sorted by section then question_index ASC */
  questions: QuizQuestion[];
  /** Passages keyed by source_id. Empty for non-Dokkai lessons. */
  passages: Record<string, QuizPassage>;
}
