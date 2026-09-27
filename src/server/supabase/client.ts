// SERVER-ONLY MODULE — do NOT import from client components.
// This file uses 'server-only' to enforce the boundary at build time.
import 'server-only';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client using the service role secret key.
 * This client must never be exposed to the browser bundle.
 *
 * Credentials are read exclusively from process.env — never from NEXT_PUBLIC_* vars.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      '[Supabase] SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY must be set in environment. ' +
      'Copy .env.example to .env.local and fill in the values.'
    );
  }

  _client = createClient(url, key, {
    auth: {
      // Service role client — no user session management needed here.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _client;
}
