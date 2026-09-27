export type WrongReasonKey = 'lupa_arti' | 'tidak_ngerti' | 'buru_buru' | 'terkecoh' | 'salah_baca' | 'lainnya';

export interface QuizAnswerSubmission {
  questionSourceId: string;
  questionIndex: number;
  selectedAnswer: string;
  responseTimeMs: number;
  answeredAt: string;
  wrongReason?: WrongReasonKey | '';
  wrongReasonOther?: string;
}

export interface QuizAttemptSubmission {
  clientAttemptKey: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  kategori: 'kotoba' | 'bunpou' | 'dokkai';
  nomor: number;
  bagian: string;
  answers: QuizAnswerSubmission[];
}

export interface FlashReviewSubmission {
  cardId: string;
  result: 'Good' | 'Again';
  responseTimeMs: number;
  reviewedAt: string;
  sourceType?: 'course_kotoba' | 'user_kotoba';
  sourceKategori?: string;
  sourceNomor?: number;
  sourceBagian?: string;
}

export interface FlashAttemptSubmission {
  clientAttemptKey: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  kategori: 'kotoba' | 'bunpou' | 'review_kotoba';
  nomor: number;
  bagian: string;
  reviews: FlashReviewSubmission[];
}
