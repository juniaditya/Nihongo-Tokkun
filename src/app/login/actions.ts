'use server';

import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/server/supabase/authServer';
import { getSupabaseClient } from '@/server/supabase/client';

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function safeNext(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

function loginError(next: string): never {
  const params = new URLSearchParams({ error: 'invalid_credentials' });
  if (next !== '/') params.set('next', next);
  redirect(`/login?${params.toString()}`);
}

export async function loginAction(formData: FormData) {
  const identifier = normalizeIdentifier(String(formData.get('identifier') || ''));
  const password = String(formData.get('password') || '');
  const next = safeNext(formData.get('next'));

  if (!identifier || !password) loginError(next);

  let email = identifier;
  if (!identifier.includes('@')) {
    const admin = getSupabaseClient();
    const { data: profile, error } = await admin
      .from('profiles')
      .select('email')
      .eq('username_normalized', identifier)
      .maybeSingle();

    if (error || !profile?.email) loginError(next);
    email = String(profile.email).trim().toLowerCase();
  }

  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) loginError(next);

  // The Auth account must be linked to a runtime profile. This prevents an
  // arbitrary Supabase Auth user from falling through to another username.
  const admin = getSupabaseClient();
  const { data: linkedProfile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();

  if (profileError || !linkedProfile) {
    await supabase.auth.signOut();
    const params = new URLSearchParams({ error: 'profile_not_linked' });
    redirect(`/login?${params.toString()}`);
  }

  redirect(next);
}
