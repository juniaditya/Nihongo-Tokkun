'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, MailCheck, UserPlus } from 'lucide-react';
import { registerWithEmail } from '@/lib/auth/actions';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button';

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const status = searchParams.get('status');
  const confirmEmail = searchParams.get('email');
  const message = searchParams.get('message');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [clientErrors, setClientErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  // If redirected with confirm-email status
  if (status === 'confirm-email') {
    return (
      <div className="glass-card overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl animate-fade-in">
        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-500/20 text-primary-400 border border-primary-500/30">
          <MailCheck className="h-8 w-8 text-primary-400" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Periksa Email Anda
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {message ||
            'Pendaftaran berhasil! Kami telah mengirimkan tautan konfirmasi ke email Anda.'}
        </p>
        {confirmEmail && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-mono text-primary-300">
            {confirmEmail}
          </div>
        )}
        <div className="mt-6 pt-4 border-t border-white/10">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-4 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
          >
            Sudah Konfirmasi? Masuk ke Akun
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setClientErrors({});

    const formData = new FormData(e.currentTarget);
    const username = (formData.get('username') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    const errors: typeof clientErrors = {};

    if (!username) {
      errors.username = 'Username wajib diisi.';
    } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      errors.username =
        'Username hanya boleh huruf, angka, dan underscore (3-30 karakter).';
    }

    if (!email) {
      errors.email = 'Email wajib diisi.';
    }

    if (!password) {
      errors.password = 'Password wajib diisi.';
    } else if (password.length < 8) {
      errors.password = 'Password minimal 8 karakter.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Konfirmasi password tidak cocok.';
    }

    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }

    startTransition(async () => {
      await registerWithEmail(formData);
    });
  };

  const formError = clientErrors.form || urlError;

  return (
    <div className="glass-card overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 text-primary-400 border border-primary-500/30">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Buat Akun Baru
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Mulai latihan JLPT dan simpan progress belajar Anda
        </p>
      </div>

      {/* Error banner */}
      {formError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 animate-fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* Google OAuth button */}
      <div className="mb-6">
        <GoogleOAuthButton label="Daftar dengan Google" />
      </div>

      {/* Divider */}
      <div className="relative mb-6 flex items-center justify-center">
        <div className="w-full border-t border-white/10" />
        <span className="absolute bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">
          atau email
        </span>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Username"
          name="username"
          type="text"
          placeholder="e.g. kenji_san"
          autoComplete="username"
          required
          disabled={isPending}
          error={clientErrors.username}
          hint="3–30 karakter (huruf, angka, _)"
        />

        <AuthInput
          label="Alamat Email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          autoComplete="email"
          required
          disabled={isPending}
          error={clientErrors.email}
        />

        <AuthInput
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
          required
          disabled={isPending}
          error={clientErrors.password}
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

        <AuthInput
          label="Konfirmasi Password"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Ulangi password"
          autoComplete="new-password"
          required
          disabled={isPending}
          error={clientErrors.confirmPassword}
          rightAction={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-muted-foreground hover:text-foreground focus:outline-none p-1 transition-colors"
              aria-label={
                showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'
              }
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />

        <div className="pt-2">
          <AuthSubmitButton isPending={isPending}>
            Daftar Akun
          </AuthSubmitButton>
        </div>
      </form>

      {/* Footer link to Login */}
      <div className="mt-6 text-center text-xs sm:text-sm text-muted-foreground">
        Sudah punya akun?{' '}
        <Link
          href="/login"
          className="font-medium text-primary-400 hover:text-primary-300 underline-offset-4 hover:underline transition-colors"
        >
          Masuk di sini
        </Link>
      </div>
    </div>
  );
}
