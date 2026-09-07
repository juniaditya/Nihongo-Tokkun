/**
 * Environment variable validation and access helper.
 * Validates required public Supabase credentials on client/server.
 */

// Next.js only inlines public variables referenced by their static property name.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const env = {
  supabase: {
    url: supabaseUrl ?? '',
    publishableKey: supabasePublishableKey ?? '',
  },
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;

export function validateEnv(): boolean {
  const hasUrl = !!env.supabase.url.trim();
  const hasKey = !!env.supabase.publishableKey.trim();
  return hasUrl && hasKey;
}
