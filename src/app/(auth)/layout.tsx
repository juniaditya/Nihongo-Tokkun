import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-background selection:bg-primary-500/30 selection:text-primary-300">
      {/* Subtle background ambient glows */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary-600/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-secondary-600/15 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-primary-900/20 blur-[140px]" />
      </div>

      {/* Top minimal bar */}
      <header className="relative z-10 flex h-16 w-full items-center justify-between px-6 sm:px-10">
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

        <ThemeToggle />
      </header>

      {/* Centered Auth Card Container */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Nihongo Tokkun. Platform Latihan JLPT Interaktif.</span>
      </footer>
    </div>
  );
}
