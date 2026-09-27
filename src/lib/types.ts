// ============================================================
// Application-level typed data contracts.
// UI components consume these types — never raw DB shapes.
// ============================================================

export type LearningCategory = 'kotoba' | 'bunpou' | 'dokkai';

export interface CourseSummary {
  id: string;
  sourceId: string;
  label: string;
  category: LearningCategory;
  dayNumber: number;
  lessonCount: number;
}

export interface LessonSummary {
  id: string;
  courseId: string;
  sourceId: string;
  label: string;
  category: LearningCategory;
  dayNumber: number;
  questionCount: number;
  flashcardCount: number;
  passageCount: number;
}

export interface LessonContent {
  lesson: LessonSummary;
  questions: Question[];
  passages: Passage[];
  flashcards: Flashcard[];
}

export interface Question {
  id: string;
  lessonId: string;
  sourceId: string;
  text: string;
  explanation: string | null;
  options: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  explanation: string | null;
}

export interface Passage {
  id: string;
  lessonId: string;
  sourceId: string;
  sectionKey: string;
  text: string;
  title: string | null;
}

export interface Flashcard {
  id: string;
  lessonId: string;
  sourceId: string;
  section?: string;
  front: string;
  reading: string | null;
  meaning: string;
  detailExplanation: string | null;
  back?: Record<string, string>;
}

export interface DailyActivity {
  date: string;
  studyTimeMs: number;
  quizAttempts: number;
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  flashcardAttempts: number;
  flashcardReviews: number;
}

export interface RecentActivity {
  type: 'quiz' | 'flashcard';
  attemptId: string;
  completedAt: string | null;
  kategori: string;
  nomor: number;
  bagian: string;
  totalCount: number;
  score: number;
  durationMs: number;
}

export interface WrongReasonSummary {
  reason: string;
  count: number;
  percentage: number;
}

export interface HardQuestionSummary {
  questionId: string;
  questionText: string;
  kategori: string;
  nomor: number;
  bagian: string;
  attempts: number;
  correct: number;
  wrong: number;
  accuracy: number;
  avgResponseTimeMs: number;
}

export interface HardFlashcardSummary {
  cardId: string;
  front: string;
  reading: string | null;
  meaning: string | null;
  kategori: string;
  nomor: number;
  bagian: string;
  reviews: number;
  good: number;
  again: number;
  goodRate: number;
  avgResponseTimeMs: number;
}

export interface SectionProgress {
  kategori: LearningCategory;
  nomor: number;
  bagian: string;
  attempts: number;
  bestScore: number | null;
  lastScore: number | null;
  firstCompletedAt: string | null;
  lastCompletedAt: string | null;
}

export interface FlashcardUnitProgress {
  kategori: string;
  nomor: number;
  bagian: string;
  attempts: number;
  bestScore: number | null;
  lastScore: number | null;
  avgScore: number;
  totalReviews: number;
  good: number;
  again: number;
  goodRate: number;
  totalDurationMs: number;
  firstCompletedAt: string | null;
  lastCompletedAt: string | null;
}

export interface LearningSummary {
  username: string;
  overview: {
    totalQuizAttempts: number;
    totalQuizAnswers: number;
    totalCorrect: number;
    totalWrong: number;
    overallAccuracy: number;
    totalQuizDurationMs: number;
    avgQuizDurationMs: number;
    avgResponseTimeMs: number;
    totalFlashcardAttempts: number;
    totalFlashcardReviews: number;
    totalGood: number;
    totalAgain: number;
    flashcardGoodRate: number;
    totalFlashcardDurationMs: number;
    avgFlashcardDurationMs: number;
    avgFlashcardResponseTimeMs: number;
    totalStudyDurationMs: number;
    currentStreak: number;
    totalActiveDays: number;
  };
  completion: {
    byDayBagian: Record<string, SectionProgress>;
    byFlashcardUnit: Record<string, FlashcardUnitProgress>;
  };
  dailyActivity: Record<string, DailyActivity>;
  recentAttempts: RecentActivity[];
  wrongReasons: WrongReasonSummary[];
  hardQuestions: HardQuestionSummary[];
  hardFlashcards: HardFlashcardSummary[];
}

export interface ReviewQueueSummary {
  dueCount: number;
  totalReviewCount: number;
  totalGood: number;
  totalAgain: number;
  recallRate: number | null;
  nextDueAt: string | null;
}

export interface CoursePageData {
  lessons: LessonSummary[];
  learning: LearningSummary;
  reviewQueue: ReviewQueueSummary;
}

export interface DashboardSummary extends LearningSummary {
  totalLessons: number;
  totalQuestions: number;
  totalFlashcards: number;
  totalPassages: number;
  lessonsByCategory: {
    kotoba: number;
    bunpou: number;
    dokkai: number;
  };
  categoryMastery: Record<LearningCategory, {
    mastered: number;
    total: number;
    percent: number;
  }>;
}

export interface SearchCard {
  cardId: string;
  category: 'kotoba' | 'bunpou';
  lessonNumber: number;
  lessonLabel: string;
  front: string;
  fields: Array<{ label: string; value: string }>;
}

export interface HealthBaseline {
  lessons: number;
  questions: number;
  questionOptions: number;
  flashcards: number;
  passages: number;
  attempts: number;
  flashcardAttempts: number;
}

/** Known Phase 6A verified production counts — used for health check baseline */
export const PRODUCTION_BASELINE: HealthBaseline = {
  lessons: 75,
  questions: 14556,
  questionOptions: 58224,
  flashcards: 2511,
  passages: 60,
  attempts: 92,
  flashcardAttempts: 286,
};

export interface FlashcardSessionCard {
  id: string;
  front: string;
  reading: string | null;
  meaning: string;
  detailExplanation: string | null;
  backFields: Array<{ label: string; value: string }>;
  sourceType: 'course_kotoba' | 'user_kotoba';
  sourceKategori: string;
  sourceNomor: number;
  sourceBagian: string;
  dueAt?: string | null;
}

export interface FlashcardSessionData {
  mode: 'lesson' | 'review';
  lesson: {
    id: string | null;
    category: 'kotoba' | 'bunpou' | 'review_kotoba';
    lessonNumber: number;
    label: string;
  };
  cards: FlashcardSessionCard[];
  nextDueAt?: string | null;
}

export interface LessonProgressItem {
  key: string;
  label: string;
  kind: 'quiz' | 'flashcard';
  attempts: number;
  bestScore: number | null;
  lastScore: number | null;
  accuracy: number | null;
  totalItems: number;
}

export interface LessonHistoryItem {
  type: 'quiz' | 'flashcard';
  attemptId: string;
  completedAt: string | null;
  label: string;
  score: number;
  totalCount: number;
  correctCount: number;
  wrongCount: number;
  durationMs: number;
}

export interface LessonMistakeItem {
  questionSourceId: string;
  questionText: string;
  section: string;
  selectedAnswer: string;
  correctAnswer: string;
  reason: string;
  reasonOther: string;
  responseTimeMs: number;
  answeredAt: string;
}

export interface LessonHardQuestion {
  questionSourceId: string;
  questionText: string;
  section: string;
  attempts: number;
  wrong: number;
  accuracy: number;
}

export interface LessonAnalysis {
  overview: {
    totalAttempts: number;
    quizAttempts: number;
    flashcardAttempts: number;
    totalStudyDurationMs: number;
    accuracy: number | null;
    wrongAnswers: number;
    flashcardGoodRate: number | null;
  };
  progress: LessonProgressItem[];
  wrongReasons: WrongReasonSummary[];
  recentHistory: LessonHistoryItem[];
  recentMistakes: LessonMistakeItem[];
  hardQuestions: LessonHardQuestion[];
  insights: string[];
}
