import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/theme-toggle';

interface TopBarProps {
  username: string;
  isAuthenticated?: boolean;
}

/**
 * Mobile topbar — visible only below 900px (app breakpoint).
 * On desktop, the sidebar provides navigation; this bar is hidden.
 */
export function TopBar({ username, isAuthenticated = false }: TopBarProps) {
  return (
    <header
      className={[
        /* hidden on desktop (sidebar takes over) */
        'app:hidden',
        /* mobile: fixed topbar */
        'fixed top-0 left-0 right-0 z-30 h-16',
        'flex items-center justify-between px-4',
        'border-b border-white/8 bg-background/95 backdrop-blur-xl',
      ].join(' ')}
    >
      {/* Logo */}
      <Link
        href={isAuthenticated ? '/dashboard' : '/'}
        className="flex items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-glow">
          <span className="font-japanese text-base font-bold">特</span>
        </div>
        <span className="font-heading text-base font-extrabold tracking-tight text-foreground">
          Nihongo{' '}
          <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            Tokkun
          </span>
        </span>
      </Link>

      {/* Right: avatar or login links + theme toggle */}
      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500/60 to-secondary-500/60 border border-white/10">
            <span className="text-xs font-bold text-white uppercase">
              {username.charAt(0)}
            </span>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            Masuk
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
