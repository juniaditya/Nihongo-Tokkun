import { createAuthServerClient } from '@/server/supabase/authServer';

export async function POST() {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
