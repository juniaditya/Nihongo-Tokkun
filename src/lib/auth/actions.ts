'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * Resolves the application origin dynamically based on incoming headers or environment variables.
 */
async function getOrigin(): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get('x-forwarded-host') || headerList.get('host');
    const proto =
      headerList.get('x-forwarded-proto') ||
      (process.env.NODE_ENV === 'production' ? 'https' : 'http');

    if (host) {
      return `${proto}://${host}`;
    }
  } catch {
    // fallback if headers() unavailable
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

// ─── Email + Password Login ───────────────────────────────────────────────────

export async function loginWithEmail(formData: FormData): Promise<void> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    redirect('/login?error=Email+dan+password+wajib+diisi');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message = encodeURIComponent(
      error.message === 'Invalid login credentials'
        ? 'Email atau password salah.'
        : error.message === 'Email not confirmed'
          ? 'Email belum dikonfirmasi. Silakan periksa email verifikasi Anda.'
          : error.message,
    );
    redirect(`/login?error=${message}`);
  }

  redirect('/dashboard');
}

// ─── Email + Password Registration ───────────────────────────────────────────

export async function registerWithEmail(formData: FormData): Promise<void> {
  const username = (formData.get('username') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Basic server-side guards
  if (!username || !email || !password || !confirmPassword) {
    redirect('/register?error=Semua+field+wajib+diisi');
  }

  if (password !== confirmPassword) {
    redirect('/register?error=Konfirmasi+password+tidak+cocok');
  }

  if (password.length < 8) {
    redirect('/register?error=Password+minimal+8+karakter');
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  if (!usernameRegex.test(username)) {
    redirect(
      '/register?error=Username+hanya+boleh+huruf%2C+angka%2C+dan+underscore+(3-30+karakter)',
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Passed to handle_new_user() trigger via raw_user_meta_data
      data: {
        username,
      },
    },
  });

  if (error) {
    const message = encodeURIComponent(
      error.message === 'User already registered'
        ? 'Email sudah terdaftar. Silakan masuk.'
        : error.message,
    );
    redirect(`/register?error=${message}`);
  }

  // If email confirmation is required by Supabase project settings:
  // User object is created, but no active session yet.
  if (data.user && !data.session) {
    redirect(
      '/register?status=confirm-email&email=' +
        encodeURIComponent(email) +
        '&message=' +
        encodeURIComponent(
          'Pendaftaran berhasil! Tautan konfirmasi telah dikirim ke email Anda. Silakan periksa kotak masuk dan lakukan verifikasi sebelum masuk.',
        ),
    );
  }

  // If auto-confirm is enabled, session is immediately active
  if (data.session) {
    redirect('/dashboard');
  }

  redirect('/login?success=Pendaftaran+berhasil.+Silakan+masuk.');
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function loginWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error || !data.url) {
    const errorMsg = error?.message
      ? encodeURIComponent(`Gagal menginisiasi login Google: ${error.message}`)
      : 'Gagal+menginisiasi+login+Google';
    redirect(`/login?error=${errorMsg}`);
  }

  redirect(data.url);
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
