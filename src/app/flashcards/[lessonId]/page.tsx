import { notFound } from 'next/navigation';
import { getFlashcardSessionForLesson } from '@/server/supabase/flashcards';
import { FlashcardShell } from '@/features/flashcards/FlashcardShell';

export const dynamic = 'force-dynamic';

export default async function FlashcardLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const session = await getFlashcardSessionForLesson(lessonId);
  if (!session) notFound();
  return <FlashcardShell session={session} />;
}
