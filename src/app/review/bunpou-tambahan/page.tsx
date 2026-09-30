import { FlashcardShell } from '@/features/flashcards/FlashcardShell';
import { getUserBunpouStudySession } from '@/server/supabase/flashcards';

export const dynamic = 'force-dynamic';

export default async function BunpouTambahanPage() {
  const session = await getUserBunpouStudySession();
  return <FlashcardShell session={session} />;
}
