import React from 'react';
import Link from 'next/link';
import { Home, Compass } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <Container size="sm" className="py-24 flex items-center justify-center">
      <Card variant="glass" className="w-full text-center">
        <CardHeader className="items-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-400 border border-primary-500/20 shadow-glow">
            <Compass className="h-7 w-7 animate-pulse-subtle" />
          </div>
          <span className="font-japanese text-3xl font-extrabold text-foreground">404</span>
          <CardTitle className="text-xl">Halaman Tidak Ditemukan</CardTitle>
          <CardDescription className="text-sm">
            Halaman atau unit latihan yang Anda cari tidak tersedia atau sedang dalam pengembangan.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Link href="/" className="w-full block">
            <Button variant="primary" className="w-full gap-2">
              <Home className="h-4 w-4" />
              Kembali ke Beranda
            </Button>
          </Link>
        </CardContent>
      </Card>
    </Container>
  );
}
