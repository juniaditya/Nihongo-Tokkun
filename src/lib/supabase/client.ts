import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';
import { env, validateEnv } from '@/lib/env';

/**
 * Creates a Supabase client for use in Client Components (browser context).
 */
export function createClient() {
  if (!validateEnv()) {
    throw new Error('Missing public Supabase environment configuration');
  }
  return createBrowserClient<Database>(
    env.supabase.url,
    env.supabase.publishableKey
  );
}
