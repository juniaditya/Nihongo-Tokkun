import React from 'react';
import Link from 'next/link';
import { BookOpen, Award, Zap, Layers, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const categories = [
    {
      title: '語彙 (Kotoba)',
      kanji: '語彙',
      subtitle: 'Kosakata & Kanji',
      description: 'Latihan arti, cara baca (読み方), pemakaian (用法), sinonim, dan relasi kata terkait.',
      color: 'kotoba',
      badgeVariant: 'kotoba' as const,
      accentClass: 'border-kotoba/30 hover:border-kotoba/60',
      gradientClass: 'from-primary-600/20 to-indigo-600/5',
      iconColor: 'text-primary-400',
    },
    {
      title: '文法 (Bunpou)',
      kanji: '文法',
      subtitle: 'Tata Bahasa & Pola Kalimat',
      description: 'Pemahaman fungsi grammar, perbedaan nuansa penggunaan (使い分け), dan susun kalimat.',
      color: 'bunpou',
      badgeVariant: 'bunpou' as const,
      accentClass: 'border-bunpou/30 hover:border-bunpou/60',
      gradientClass: 'from-amber-500/20 to-orange-500/5',
      iconColor: 'text-amber-400',
    },
    {
      title: '読解 (Dokkai)',
      kanji: '読解',
      subtitle: 'Pemahaman Membaca',
      description: 'Latihan teks pendek (短文), sedang (中文), hingga pemahaman terpadu (統合理解).',
      color: 'dokkai',
      badgeVariant: 'dokkai' as const,
      accentClass: 'border-dokkai/30 hover:border-dokkai/60',
      gradientClass: 'from-emerald-500/20 to-teal-500/5',
      iconColor: 'text-emerald-400',
    },
  ];

  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

  return (
    <div className="relative overflow-hidden py-12 sm:py-16">
      {/* Ambient background glow effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary-600/20 to-secondary-600/20 blur-[120px]" />

      <Container size="lg">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
          <Badge variant="primary" className="px-3.5 py-1 text-xs gap-1.5 shadow-glass-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary-400" />
            <span>Fondasi Aplikasi Terstruktur</span>
          </Badge>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
            Latihan JLPT Interaktif <br />
            <span className="bg-gradient-to-r from-primary-500 via-indigo-400 to-secondary-500 bg-clip-text text-transparent">
              Cepat, Terstruktur, & Nyaman
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl font-sans">
            Tingkatkan penguasaan bahasa Jepang dari <span className="font-semibold text-foreground">N5 hingga N1</span> dengan kurikulum terbagi ke dalam unit latihan bernomor, drill per tipe soal, dan flashcard SRS.
          </p>

          {/* Level Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">Tersedia Level:</span>
            {levels.map((lvl) => (
              <Badge
                key={lvl}
                variant="outline"
                className="px-3 py-1 text-xs font-bold hover:border-primary-500/50 hover:bg-primary-500/10 cursor-pointer transition-colors"
              >
                {lvl}
              </Badge>
            ))}
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {categories.map((cat) => (
            <Card
              key={cat.title}
              variant="interactive"
              className={`relative overflow-hidden ${cat.accentClass}`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${cat.gradientClass} pointer-events-none opacity-60`}
              />
              <CardHeader className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-japanese text-3xl font-extrabold tracking-wide text-foreground/90">
                    {cat.kanji}
                  </span>
                  <Badge variant={cat.badgeVariant}>{cat.subtitle}</Badge>
                </div>
                <CardTitle className="text-xl">{cat.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed min-h-[4rem]">
                  {cat.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Unit Latihan Terpisah</span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    Lihat Materi <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 rounded-3xl border border-white/10 bg-card/60 backdrop-blur-xl p-8 sm:p-10 shadow-glass">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="flex flex-col items-center sm:items-start space-y-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary-500/15 flex items-center justify-center text-primary-400 border border-primary-500/30">
                <Layers className="h-5 w-5" />
              </div>
              <h4 className="font-heading font-bold text-base text-foreground">
                Sesi Per Tipe Soal
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tiap question_type dilatih terpisah dengan syarat kelulusan &ge; 90% per unit.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-start space-y-2.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 border border-amber-500/30">
                <Zap className="h-5 w-5" />
              </div>
              <h4 className="font-heading font-bold text-base text-foreground">
                Flashcard SRS Cepat
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review kosakata dan pola kalimat langsung per lesson dengan tombol rating Again & Good.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-start space-y-2.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                <Award className="h-5 w-5" />
              </div>
              <h4 className="font-heading font-bold text-base text-foreground">
                Leaderboard & Streak
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pantau ketepatan skor dan waktu belajar harian secara kompetitif dan aman.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
