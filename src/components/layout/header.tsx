import React from 'react';
import Link from 'next/link';
import { Sparkles, BookOpen } from 'lucide-react';
import { Container } from './container';
import { ThemeToggle } from './theme-toggle';
import { Badge } from '@/components/ui/badge';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl transition-colors duration-300">
      <Container size="lg">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-glow">
              <span className="font-japanese text-lg font-bold">特</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-extrabold tracking-tight text-foreground">
                  Nihongo <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">Tokkun</span>
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground hidden sm:flex">
              <Sparkles className="h-4 w-4 text-primary-400 animate-pulse-subtle" />
              <span>Belajar Berstruktur</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </Container>
    </header>
  );
}
