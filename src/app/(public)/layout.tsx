import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <header className="relative z-10 flex h-16 w-full items-center justify-between px-4 sm:px-6 border-b border-white/8 bg-background/95 backdrop-blur-xl">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-glow">
            <span className="font-japanese text-base font-bold">特</span>
          </div>
          <span className="font-heading text-lg font-extrabold tracking-tight text-foreground">
            Nihongo{' '}
            <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              Tokkun
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="text-xs font-semibold text-white bg-gradient-to-r from-primary-500 to-secondary-500 px-3 py-1.5 rounded-lg shadow-glow hover:opacity-90 transition-opacity"
          >
            Daftar
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="relative z-10 py-6 text-center text-xs text-muted-foreground border-t border-white/8">
        <span>© {new Date().getFullYear()} Nihongo Tokkun. Platform Latihan JLPT Interaktif.</span>
      </footer>
    </div>
  );
}
