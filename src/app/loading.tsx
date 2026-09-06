import React from 'react';
import { Container } from '@/components/layout/container';

export default function Loading() {
  return (
    <Container size="md" className="py-24 flex flex-col items-center justify-center text-center">
      <div className="relative flex items-center justify-center">
        <div className="h-16 w-16 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
        <div className="absolute font-japanese text-xs font-bold text-primary-400 animate-pulse">
          特訓
        </div>
      </div>
      <p className="mt-6 text-sm text-muted-foreground font-medium animate-pulse">
        Memuat data pembelajaran...
      </p>
    </Container>
  );
}
