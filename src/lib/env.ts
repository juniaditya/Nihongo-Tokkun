/**
 * Environment variable validation and access helper.
 * Validates required public Supabase credentials on client/server.
 */

function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    // In production build or browser runtime, provide meaningful error
    if (process.env.NODE_ENV === 'production' && !fallback) {
      console.warn(`[Config] Missing environment variable: ${name}`);
    }
    return '';
  }
  return value;
}

export const env = {
  supabase: {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'https://placeholder-project.supabase.co'),
    publishableKey:
      getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
      getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'placeholder-publishable-key'),
  },
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;

export function validateEnv(): boolean {
  const hasUrl = !!env.supabase.url && env.supabase.url !== 'https://placeholder-project.supabase.co';
  const hasKey = !!env.supabase.publishableKey && env.supabase.publishableKey !== 'placeholder-publishable-key';
  return hasUrl && hasKey;
}
