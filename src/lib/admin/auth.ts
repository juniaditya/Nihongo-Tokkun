import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Call from every page and mutation, not only the layout.
export async function requireAdmin() {
  // SSR 0.5 declares the older SupabaseClient generic signature.
  const supabase = await createClient() as unknown as SupabaseClient<Database>;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  const profile = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile.error || profile.data?.role !== 'admin') redirect('/dashboard');
  return { supabase, user };
}
