'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, CheckCircle2, LogIn } from 'lucide-react';
import { loginWithEmail } from '@/lib/auth/actions';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const urlSuccess = searchParams.get('success');

  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setClientError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string)?.trim();
    const password = formData.get('password') as string;

    if (!email || !password) {
      setClientError('Email dan password wajib diisi.');
      return;
    }

    startTransition(async () => {
      await loginWithEmail(formData);
    });
  };

  const errorMessage = clientError || urlError;

  return (
    <div className="glass-card overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 text-primary-400 border border-primary-500/30">
          <LogIn className="h-6 w-6" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Selamat Datang Kembali
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Masuk ke akun Anda untuk melanjutkan latihan JLPT
        </p>
      </div>

      {/* Success banner */}
      {urlSuccess && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-3.5 text-xs text-green-300"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400 mt-0.5" />
          <span>{urlSuccess}</span>
        </div>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 animate-fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Google OAuth button */}
      <div className="mb-6">
        <GoogleOAuthButton label="Masuk dengan Google" />
      </div>

      {/* Divider */}
      <div className="relative mb-6 flex items-center justify-center">
        <div className="w-full border-t border-white/10" />
        <span className="absolute bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">
          atau email
        </span>
      </div>

      {/* Email / Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Alamat Email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          autoComplete="email"
          required
          disabled={isPending}
        />

        <AuthInput
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          disabled={isPending}
          rightAction={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground focus:outline-none p-1 transition-colors"
              aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />

        <div className="pt-2">
          <AuthSubmitButton isPending={isPending}>
            Masuk ke Akun
          </AuthSubmitButton>
        </div>
      </form>

      {/* Footer link to Register */}
      <div className="mt-6 text-center text-xs sm:text-sm text-muted-foreground">
        Belum punya akun?{' '}
        <Link
          href="/register"
          className="font-medium text-primary-400 hover:text-primary-300 underline-offset-4 hover:underline transition-colors"
        >
          Daftar sekarang
        </Link>
      </div>
    </div>
  );
}
