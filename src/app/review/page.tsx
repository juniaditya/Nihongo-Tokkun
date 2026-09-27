import { FlashcardShell } from '@/features/flashcards/FlashcardShell';
import { getReviewFlashcardSession } from '@/server/supabase/flashcards';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const session = await getReviewFlashcardSession();
  return <FlashcardShell session={session} />;
}
