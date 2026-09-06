import type { Database } from './database.types';

export * from './database.types';

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];

export type Enums<T extends keyof Database['public']> = Database['public'][T];

// Domain Models
export type Course = Tables<'courses'>;
export type Lesson = Tables<'lessons'>;
export type Kotoba = Tables<'kotoba'>;
export type KotobaRelation = Tables<'kotoba_relations'>;
export type Bunpou = Tables<'bunpou'>;
export type DokkaiPassage = Tables<'dokkai_passages'>;
export type Question = Tables<'questions'>;
export type QuestionOption = Tables<'question_options'>;
export type Flashcard = Tables<'flashcards'>;
export type Profile = Tables<'profiles'>;
export type PracticeSession = Tables<'practice_sessions'>;
export type QuestionAttempt = Tables<'question_attempts'>;
export type MistakeLog = Tables<'mistake_logs'>;
export type FlashcardReview = Tables<'flashcard_reviews'>;
export type FlashcardState = Tables<'flashcard_states'>;
export type SubscriptionTier = Tables<'subscription_tiers'>;
export type LessonProgress = Tables<'lesson_progress'>;
export type LessonTypeProgress = Tables<'lesson_type_progress'>;
export type AppConfig = Tables<'app_config'>;
export type MistakeReasonPreset = Tables<'mistake_reason_presets'>;
export type UserStreak = Tables<'user_streaks'>;
export type EditLock = Tables<'edit_locks'>;

// Views
export type PublicLessonCatalog = Views<'v_public_lesson_catalog'>;
export type PracticeQuestion = Views<'v_practice_questions'>;
export type PracticeQuestionOption = Views<'v_practice_question_options'>;
export type UserGlobalStats = Views<'v_user_global_stats'>;
export type UserCourseStats = Views<'v_user_course_stats'>;

// App Domain Types
export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type LessonCategory = 'kotoba' | 'bunpou' | 'dokkai';
export type UserRole = 'user' | 'admin';
export type SubscriptionCode = 'free' | 'premium';
export type FlashcardRating = 'again' | 'good'; // MVP Anki-style 2-scale rating
