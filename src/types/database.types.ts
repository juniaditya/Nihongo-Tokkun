export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          name: string;
          level: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          level?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          level?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          category: 'kotoba' | 'bunpou' | 'dokkai';
          number: number;
          title: string | null;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          is_guest_accessible: boolean;
          time_limit_seconds: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          category: 'kotoba' | 'bunpou' | 'dokkai';
          number: number;
          title?: string | null;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          is_guest_accessible?: boolean;
          time_limit_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          category?: 'kotoba' | 'bunpou' | 'dokkai';
          number?: number;
          title?: string | null;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          is_guest_accessible?: boolean;
          time_limit_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      kotoba: {
        Row: {
          id: string;
          lesson_id: string;
          word: string;
          reading: string | null;
          meaning: string | null;
          explanation: string | null;
          is_supplementary: boolean;
          legacy_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          word: string;
          reading?: string | null;
          meaning?: string | null;
          explanation?: string | null;
          is_supplementary?: boolean;
          legacy_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          word?: string;
          reading?: string | null;
          meaning?: string | null;
          explanation?: string | null;
          is_supplementary?: boolean;
          legacy_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      kotoba_relations: {
        Row: {
          id: string;
          kotoba_id: string;
          related_kotoba_id: string;
          relation_type: 'related_kanji' | 'synonym' | 'antonym' | 'confusable' | 'other';
          explanation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          kotoba_id: string;
          related_kotoba_id: string;
          relation_type: 'related_kanji' | 'synonym' | 'antonym' | 'confusable' | 'other';
          explanation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          kotoba_id?: string;
          related_kotoba_id?: string;
          relation_type?: 'related_kanji' | 'synonym' | 'antonym' | 'confusable' | 'other';
          explanation?: string | null;
          created_at?: string;
        };
      };
      bunpou: {
        Row: {
          id: string;
          lesson_id: string;
          grammar: string;
          function: string | null;
          examples: string | null;
          formula: string | null;
          meaning: string | null;
          key_difference: string | null;
          is_supplementary: boolean;
          legacy_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          grammar: string;
          function?: string | null;
          examples?: string | null;
          formula?: string | null;
          meaning?: string | null;
          key_difference?: string | null;
          is_supplementary?: boolean;
          legacy_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          grammar?: string;
          function?: string | null;
          examples?: string | null;
          formula?: string | null;
          meaning?: string | null;
          key_difference?: string | null;
          is_supplementary?: boolean;
          legacy_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      dokkai_passages: {
        Row: {
          id: string;
          lesson_id: string;
          passage_type: 'tanbun' | 'chuubun' | 'tougou' | 'chobun' | 'jouhou';
          title: string | null;
          passage: string | null;
          passage_a: string | null;
          passage_b: string | null;
          legacy_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          passage_type: 'tanbun' | 'chuubun' | 'tougou' | 'chobun' | 'jouhou';
          title?: string | null;
          passage?: string | null;
          passage_a?: string | null;
          passage_b?: string | null;
          legacy_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          passage_type?: 'tanbun' | 'chuubun' | 'tougou' | 'chobun' | 'jouhou';
          title?: string | null;
          passage?: string | null;
          passage_a?: string | null;
          passage_b?: string | null;
          legacy_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          lesson_id: string;
          kotoba_id: string | null;
          bunpou_id: string | null;
          passage_id: string | null;
          question_type: string;
          question_text: string;
          explanation: string | null;
          legacy_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          kotoba_id?: string | null;
          bunpou_id?: string | null;
          passage_id?: string | null;
          question_type: string;
          question_text: string;
          explanation?: string | null;
          legacy_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          kotoba_id?: string | null;
          bunpou_id?: string | null;
          passage_id?: string | null;
          question_type?: string;
          question_text?: string;
          explanation?: string | null;
          legacy_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      question_options: {
        Row: {
          id: string;
          question_id: string;
          option_text: string;
          option_order: number;
          is_correct: boolean;
          explanation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_text: string;
          option_order: number;
          is_correct?: boolean;
          explanation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          option_text?: string;
          option_order?: number;
          is_correct?: boolean;
          explanation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      flashcards: {
        Row: {
          id: string;
          lesson_id: string;
          kotoba_id: string | null;
          bunpou_id: string | null;
          front: string;
          reading: string | null;
          meaning: string | null;
          explanation: string | null;
          legacy_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          kotoba_id?: string | null;
          bunpou_id?: string | null;
          front: string;
          reading?: string | null;
          meaning?: string | null;
          explanation?: string | null;
          legacy_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          kotoba_id?: string | null;
          bunpou_id?: string | null;
          front?: string;
          reading?: string | null;
          meaning?: string | null;
          explanation?: string | null;
          legacy_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          role: 'user' | 'admin';
          tier_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          role?: 'user' | 'admin';
          tier_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          role?: 'user' | 'admin';
          tier_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      practice_sessions: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string | null;
          category: 'kotoba' | 'bunpou' | 'dokkai' | null;
          section: string | null;
          total_questions: number;
          correct_answers: number;
          score: number | null;
          passing_grade_percent: number | null;
          passed: boolean | null;
          time_limit_seconds_snapshot: number | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id?: string | null;
          category?: 'kotoba' | 'bunpou' | 'dokkai' | null;
          section?: string | null;
          total_questions?: number;
          correct_answers?: number;
          score?: number | null;
          passing_grade_percent?: number | null;
          passed?: boolean | null;
          time_limit_seconds_snapshot?: number | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string | null;
          category?: 'kotoba' | 'bunpou' | 'dokkai' | null;
          section?: string | null;
          total_questions?: number;
          correct_answers?: number;
          score?: number | null;
          passing_grade_percent?: number | null;
          passed?: boolean | null;
          time_limit_seconds_snapshot?: number | null;
          started_at?: string;
          completed_at?: string | null;
        };
      };
      question_attempts: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          question_id: string;
          selected_option_id: string | null;
          is_correct: boolean | null;
          answered_at: string;
          response_time_ms: number | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          question_id: string;
          selected_option_id?: string | null;
          is_correct?: boolean | null;
          answered_at?: string;
          response_time_ms?: number | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          question_id?: string;
          selected_option_id?: string | null;
          is_correct?: boolean | null;
          answered_at?: string;
          response_time_ms?: number | null;
        };
      };
      mistake_logs: {
        Row: {
          id: string;
          attempt_id: string;
          user_id: string;
          reason: string | null;
          custom_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          user_id: string;
          reason?: string | null;
          custom_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          user_id?: string;
          reason?: string | null;
          custom_reason?: string | null;
          created_at?: string;
        };
      };
      flashcard_reviews: {
        Row: {
          id: string;
          user_id: string;
          flashcard_id: string;
          rating: 'again' | 'hard' | 'good' | 'easy';
          reviewed_at: string;
          next_review_at: string | null;
          review_count: number;
          request_id: string | null;
          legacy_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          flashcard_id: string;
          rating: 'again' | 'hard' | 'good' | 'easy';
          reviewed_at?: string;
          next_review_at?: string | null;
          review_count?: number;
          request_id?: string | null;
          legacy_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          flashcard_id?: string;
          rating?: 'again' | 'hard' | 'good' | 'easy';
          reviewed_at?: string;
          next_review_at?: string | null;
          review_count?: number;
          request_id?: string | null;
          legacy_id?: string | null;
        };
      };
      flashcard_states: {
        Row: {
          user_id: string;
          flashcard_id: string;
          last_rating: string | null;
          review_count: number;
          last_reviewed_at: string;
          next_review_at: string | null;
        };
        Insert: {
          user_id: string;
          flashcard_id: string;
          last_rating?: string | null;
          review_count?: number;
          last_reviewed_at?: string;
          next_review_at?: string | null;
        };
        Update: {
          user_id?: string;
          flashcard_id?: string;
          last_rating?: string | null;
          review_count?: number;
          last_reviewed_at?: string;
          next_review_at?: string | null;
        };
      };
      subscription_tiers: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          status: 'not_started' | 'in_progress' | 'completed';
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          status?: 'not_started' | 'in_progress' | 'completed';
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          status?: 'not_started' | 'in_progress' | 'completed';
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      lesson_type_progress: {
        Row: {
          user_id: string;
          lesson_id: string;
          question_type: string;
          best_score: number | null;
          passed: boolean;
          attempts_count: number;
          last_attempt_at: string | null;
        };
        Insert: {
          user_id: string;
          lesson_id: string;
          question_type: string;
          best_score?: number | null;
          passed?: boolean;
          attempts_count?: number;
          last_attempt_at?: string | null;
        };
        Update: {
          user_id?: string;
          lesson_id?: string;
          question_type?: string;
          best_score?: number | null;
          passed?: boolean;
          attempts_count?: number;
          last_attempt_at?: string | null;
        };
      };
      app_config: {
        Row: {
          key: string;
          value: string;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          description?: string | null;
          updated_at?: string;
        };
      };
      mistake_reason_presets: {
        Row: {
          id: string;
          label: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      user_streaks: {
        Row: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_active_date: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_active_date?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_active_date?: string | null;
          updated_at?: string;
        };
      };
      edit_locks: {
        Row: {
          target_key: string;
          user_id: string;
          locked_at: string;
          last_active_at: string;
        };
        Insert: {
          target_key: string;
          user_id: string;
          locked_at?: string;
          last_active_at?: string;
        };
        Update: {
          target_key?: string;
          user_id?: string;
          locked_at?: string;
          last_active_at?: string;
        };
      };
    };
    Views: {
      v_public_lesson_catalog: {
        Row: {
          id: string;
          course_id: string;
          category: 'kotoba' | 'bunpou' | 'dokkai';
          number: number;
          title: string | null;
          is_guest_accessible: boolean;
          time_limit_seconds: number | null;
          sort_order: number;
        };
      };
      v_practice_questions: {
        Row: {
          id: string;
          lesson_id: string;
          question_type: string;
          question_text: string;
          sort_order: number;
          passage_id: string | null;
        };
      };
      v_practice_question_options: {
        Row: {
          id: string;
          question_id: string;
          option_text: string;
          option_order: number;
        };
      };
      v_user_global_stats: {
        Row: {
          user_id: string;
          sessions_completed: number;
          total_correct: number;
          total_questions: number;
          accuracy_percent: number;
          total_time_seconds: number;
          username: string | null;
        };
      };
      v_user_course_stats: {
        Row: {
          user_id: string;
          course_id: string;
          sessions_completed: number;
          total_correct: number;
          total_questions: number;
          accuracy_percent: number;
          total_time_seconds: number;
          username: string | null;
        };
      };
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      start_practice_session: {
        Args: {
          p_lesson_id: string;
          p_question_type: string;
        };
        Returns: Json;
      };
      submit_practice_answer: {
        Args: {
          p_session_id: string;
          p_question_id: string;
          p_selected_option_id: string;
          p_response_time_ms?: number | null;
        };
        Returns: Json;
      };
      finalize_practice_session: {
        Args: {
          p_session_id: string;
        };
        Returns: Json;
      };
      log_mistake_reason: {
        Args: {
          p_attempt_id: string;
          p_reason: string;
          p_custom_reason?: string | null;
        };
        Returns: Json;
      };
      submit_flashcard_review: {
        Args: {
          p_flashcard_id: string;
          p_rating: string;
          p_request_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
