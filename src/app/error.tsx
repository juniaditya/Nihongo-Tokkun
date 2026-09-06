'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring if configured
    console.error('[Application Error]:', error);
  }, [error]);

  return (
    <Container size="sm" className="py-20 flex items-center justify-center">
      <Card variant="glass" className="w-full text-center border-red-500/20">
        <CardHeader className="items-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Terjadi Kesalahan</CardTitle>
          <CardDescription className="text-sm">
            Maaf, sistem mengalami kendala saat memuat halaman ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-xl bg-black/20 text-xs text-muted-foreground font-mono text-left overflow-auto max-h-24">
            {error.message || 'Unknown error occurred'}
          </div>
          <Button onClick={reset} variant="primary" className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
