import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[Supabase Auth] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured.'
    );
  }

  return { url, key };
}

/**
 * Request-scoped Supabase Auth client for Server Components, Server Actions,
 * and Route Handlers. The user session is stored in HttpOnly-compatible auth
 * cookies managed by @supabase/ssr.
 */
export async function createAuthServerClient() {
  const cookieStore = await cookies();
  const { url, key } = getPublicSupabaseConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. Session refresh writes are
          // handled by src/proxy.ts on incoming requests.
        }
      },
    },
  });
}
