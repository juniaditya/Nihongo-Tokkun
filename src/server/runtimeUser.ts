import 'server-only';

import { createAuthServerClient } from './supabase/authServer';
import { getSupabaseClient } from './supabase/client';

export type RuntimeProfile = {
  authUserId: string;
  username: string;
  displayName: string;
  role: 'admin' | 'user';
  email: string;
};

async function resolveRuntimeProfile(optional: boolean): Promise<RuntimeProfile | null> {
  const auth = await createAuthServerClient();
  const { data, error } = await auth.auth.getClaims();
  const claims = error ? null : data?.claims;
  const authUserId = typeof claims?.sub === 'string' ? claims.sub : '';

  if (!authUserId) {
    if (optional) return null;
    throw new Error('AUTH_REQUIRED');
  }

  const admin = getSupabaseClient();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('auth_user_id, username, role, email')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`[Runtime User] ${profileError.message}`);
  }

  if (!profile?.username) {
    if (optional) return null;
    throw new Error('PROFILE_NOT_LINKED');
  }

  const username = String(profile.username).trim();

  return {
    authUserId,
    username,
    displayName: username,
    role: profile.role === 'admin' ? 'admin' : 'user',
    email: String(profile.email || '').trim(),
  };
}

export async function getRuntimeProfile(): Promise<RuntimeProfile> {
  const profile = await resolveRuntimeProfile(false);
  if (!profile) throw new Error('AUTH_REQUIRED');
  return profile;
}

export async function getOptionalRuntimeProfile(): Promise<RuntimeProfile | null> {
  return resolveRuntimeProfile(true);
}

export async function getRuntimeUsername(): Promise<string> {
  return (await getRuntimeProfile()).username;
}

export async function getRuntimeDisplayName(): Promise<string> {
  return (await getRuntimeProfile()).displayName;
}
