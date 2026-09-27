'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createAuthBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('[Supabase Auth] Public Supabase environment variables are missing.');
  }

  return createBrowserClient(url, key);
}
