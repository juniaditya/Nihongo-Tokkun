import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Inter, Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-japanese',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Nihongo Tokkun — Aplikasi Belajar Bahasa Jepang Berbasis JLPT',
  description:
    'Latihan bahasa Jepang interaktif terstruktur per level JLPT (N5–N1). Dilengkapi latihan Kotoba (Kosakata), Bunpou (Tata Bahasa), dan Dokkai (Membaca).',
  keywords: ['JLPT', 'N5', 'N4', 'N3', 'N2', 'N1', 'Bahasa Jepang', 'Kotoba', 'Bunpou', 'Dokkai', 'Flashcard'],
  authors: [{ name: 'Nihongo Tokkun Team' }],
};

export const viewport: Viewport = {
  themeColor: '#0b0f19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`dark ${plusJakartaSans.variable} ${inter.variable} ${notoSansJP.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
