import React from 'react';
import Link from 'next/link';
import { User, LogOut } from 'lucide-react';
import { Container } from './container';
import { ThemeToggle } from './theme-toggle';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/lib/auth/actions';
import type { Database } from '@/types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const profileResult = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    const profile = profileResult.data as Pick<ProfileRow, 'username'> | null;

    username =
      profile?.username ||
      (user.user_metadata?.username as string | undefined) ||
      user.email?.split('@')[0] ||
      'Akun';
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl transition-colors duration-300">
      <Container size="lg">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href={user ? '/dashboard' : '/'}
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-glow">
              <span className="font-japanese text-lg font-bold">特</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-extrabold tracking-tight text-foreground">
                  Nihongo{' '}
                  <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                    Tokkun
                  </span>
                </span>
                <Badge variant="primary" className="hidden sm:inline-flex text-[10px]">
                  JLPT N5–N1
                </Badge>
              </div>
              <span className="font-japanese text-[11px] text-muted-foreground">
                日本語特訓アプリ
              </span>
            </div>
          </Link>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/10 transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-primary-400" />
                  <span className="max-w-[120px] truncate">{username}</span>
                </Link>

                <form action={logout}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                    title="Keluar dari akun"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Keluar</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
                >
                  Daftar
                </Link>
              </div>
            )}

            <ThemeToggle />
          </div>
        </div>
      </Container>
    </header>
  );
}
