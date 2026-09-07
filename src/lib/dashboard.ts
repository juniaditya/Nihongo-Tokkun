import { createClient } from '@/lib/supabase/server';
import { readAll, type LessonProgress } from '@/lib/learning-progress';
import type { Database } from '@/types/database.types';
type Course = Pick<Database['public']['Tables']['courses']['Row'], 'id' | 'name' | 'level'>;
type Lesson = Pick<Database['public']['Views']['v_public_lesson_catalog']['Row'], 'id' | 'course_id' | 'category' | 'number' | 'title' | 'sort_order'>;
type Session = Pick<Database['public']['Tables']['practice_sessions']['Row'], 'id' | 'lesson_id' | 'section' | 'correct_answers' | 'total_questions' | 'started_at' | 'completed_at'>;

export async function loadDashboard(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [courses, lessons, progress, sessions] = await Promise.all([
    readAll<Course>((from, to) => supabase.from('courses').select('id,name,level').order('level').order('id').range(from, to)),
    readAll<Lesson>((from, to) => supabase.from('v_public_lesson_catalog').select('id,course_id,category,number,title,sort_order').order('sort_order').order('number').order('id').range(from, to)),
    readAll<LessonProgress>((from, to) => supabase.from('lesson_progress').select('lesson_id,status,updated_at').eq('user_id', userId).order('lesson_id').range(from, to)),
    readAll<Session>((from, to) => supabase.from('practice_sessions').select('id,lesson_id,section,correct_answers,total_questions,started_at,completed_at').eq('user_id', userId).order('started_at', { ascending: false }).order('id').range(from, to)),
  ]);
  const completed = sessions.filter(session => session.completed_at !== null);
  const questions = completed.reduce((sum, session) => sum + session.total_questions, 0);
  const correct = completed.reduce((sum, session) => sum + session.correct_answers, 0);
  const status = new Map(progress.map(row => [row.lesson_id, row.status]));
  const activity = [...sessions].sort((a, b) => (b.completed_at ?? b.started_at).localeCompare(a.completed_at ?? a.started_at));
  const recentLesson = activity.map(session => lessons.find(lesson => lesson.id === session.lesson_id))
    .find(lesson => lesson && status.get(lesson.id) !== 'completed');
  const inProgress = [...progress].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .find(row => row.status === 'in_progress' && lessons.some(lesson => lesson.id === row.lesson_id));
  const continueLesson = recentLesson ?? lessons.find(lesson => lesson.id === inProgress?.lesson_id)
    ?? lessons.find(lesson => status.get(lesson.id) !== 'completed') ?? lessons[0];
  return {
    courses, lessons, status, continueLesson, activity: activity.slice(0, 5),
    completedLessons: lessons.filter(lesson => status.get(lesson.id) === 'completed').length,
    inProgressLessons: lessons.filter(lesson => status.get(lesson.id) === 'in_progress').length,
    completedSessions: completed.length,
    accuracy: questions > 0 ? Math.round(correct / questions * 100) : null,
  };
}
