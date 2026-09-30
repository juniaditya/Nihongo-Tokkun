import { FlashcardShell } from '@/features/flashcards/FlashcardShell';
import { getUserKotobaStudySession } from '@/server/supabase/flashcards';

export const dynamic = 'force-dynamic';

export default async function KotobaTambahanPage() {
  const session = await getUserKotobaStudySession();
  return <FlashcardShell session={session} />;
}
