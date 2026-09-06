'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/providers';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="glass"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle tema (terang/gelap)"
      title={`Beralih ke mode ${theme === 'dark' ? 'terang' : 'gelap'}`}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-amber-300 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-5 w-5 text-indigo-600 transition-transform duration-300 hover:-rotate-12" />
      )}
    </Button>
  );
}
