'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface AuthSubmitButtonProps {
  children: React.ReactNode;
  isPending?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
  type?: 'submit' | 'button';
  onClick?: () => void;
  disabled?: boolean;
}

export function AuthSubmitButton({
  children,
  isPending = false,
  variant = 'primary',
  className = '',
  type = 'submit',
  onClick,
  disabled,
}: AuthSubmitButtonProps) {
  const base =
    'relative flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  const variants = {
    primary:
      'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-glow hover:opacity-90 active:scale-[0.98] focus-visible:ring-primary-500',
    secondary:
      'border border-white/15 bg-white/5 text-foreground hover:bg-white/10 active:scale-[0.98] focus-visible:ring-white/30',
  };

  return (
    <button
      type={type}
      disabled={disabled ?? isPending}
      onClick={onClick}
      className={[base, variants[variant], className].filter(Boolean).join(' ')}
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Memproses...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
