import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PracticeSession } from './practice-session';
import type { Database } from '@/types/database.types';

type LessonCatalogRow = Database['public']['Views']['v_public_lesson_catalog']['Row'];
type MistakePresetRow = Database['public']['Tables']['mistake_reason_presets']['Row'];

interface PracticePageProps {
  params: Promise<{
    lessonId: string;
    questionType: string;
  }>;
}

function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    arti: 'Arti Kata (意味)',
    cara_baca: 'Cara Baca Kanji (読み方)',
    penggunaan_kalimat: 'Penggunaan Kalimat (用法)',
    cara_pakai: 'Cara Pakai (文脈規定)',
    sinonim: 'Sinonim (類義語)',
    grammar_choice: 'Pilihan Tata Bahasa (文法形式)',
    fill_in: 'Isi Kosong Kalimat (穴埋め)',
    ordering: 'Urutan Kalimat (文の組み立て)',
    comprehension: 'Pemahaman Bacaan (文章読解)',
    // English fallbacks if any
    meaning: 'Arti Kata (意味)',
    reading: 'Cara Baca (読み方)',
    usage: 'Penggunaan (用法)',
    context: 'Konteks (文脈)',
    synonym: 'Sinonim (類義語)',
  };
  return labels[type] ?? type;
}

export async function generateMetadata({ params }: PracticePageProps): Promise<Metadata> {
  const { lessonId, questionType } = await params;
  const decodedType = decodeURIComponent(questionType);
  const supabase = await createClient();

  const { data } = await supabase
    .from('v_public_lesson_catalog')
    .select('title, category, number')
    .eq('id', lessonId)
    .maybeSingle();

  const lesson = data as Pick<LessonCatalogRow, 'title' | 'category' | 'number'> | null;
  const lessonTitle = lesson?.title ?? `Lesson ${lesson?.number ?? ''}`;
  const typeLabel = getQuestionTypeLabel(decodedType);

  return {
    title: `Latihan: ${typeLabel} - ${lessonTitle} | Nihongo Tokkun`,
    description: `Sesi latihan interaktif ${typeLabel} untuk materi ${lessonTitle}.`,
  };
}

export default async function PracticePage({ params }: PracticePageProps) {
  const { lessonId, questionType } = await params;
  const decodedType = decodeURIComponent(questionType);
  const supabase = await createClient();

  // 1. Fetch lesson catalog metadata from safe view
  const { data: catalogData, error: catalogErr } = await supabase
    .from('v_public_lesson_catalog')
    .select('id, category, number, title')
    .eq('id', lessonId)
    .maybeSingle();

  if (catalogErr || !catalogData) {
    console.error('[PracticePage] catalog fetch error:', catalogErr);
    notFound();
  }

  const catalogLesson = catalogData as LessonCatalogRow;
  const category = catalogLesson.category;
  const lessonTitle =
    catalogLesson.title ?? `${category === 'kotoba' ? 'Kotoba' : category === 'bunpou' ? 'Bunpou' : 'Dokkai'} ${catalogLesson.number}`;
  const questionTypeLabel = getQuestionTypeLabel(decodedType);

  // 2. Fetch active mistake reason presets
  const { data: presetsData } = await supabase
    .from('mistake_reason_presets')
    .select('id, label')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const mistakePresets = (presetsData || []).map((p: Pick<MistakePresetRow, 'id' | 'label'>) => ({
    id: p.id,
    label: p.label,
  }));

  return (
    <PracticeSession
      lessonId={lessonId}
      questionType={decodedType}
      lessonTitle={lessonTitle}
      category={category}
      questionTypeLabel={questionTypeLabel}
      mistakePresets={mistakePresets}
    />
  );
}
