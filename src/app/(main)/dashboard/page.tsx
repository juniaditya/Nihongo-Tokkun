import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Container } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, User, Award, CheckCircle } from 'lucide-react';
import type { Database } from '@/types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type SubscriptionTierRow = Database['public']['Tables']['subscription_tiers']['Row'];

export default async function DashboardPlaceholderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile and tier details
  const profileResult = await supabase
    .from('profiles')
    .select('id, username, role, tier_id, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const profile = profileResult.data as Pick<
    ProfileRow,
    'id' | 'username' | 'role' | 'tier_id' | 'created_at'
  > | null;

  let tierName = 'free';
  if (profile?.tier_id) {
    const tierResult = await supabase
      .from('subscription_tiers')
      .select('name, code')
      .eq('id', profile.tier_id)
      .maybeSingle();

    const tier = tierResult.data as Pick<SubscriptionTierRow, 'name' | 'code'> | null;
    if (tier?.code) {
      tierName = tier.code;
    }
  }

  const displayName =
    profile?.username ||
    (user.user_metadata?.username as string | undefined) ||
    user.email?.split('@')[0] ||
    'Pengguna';

  return (
    <div className="py-10 sm:py-16">
      <Container size="md">
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Selamat Datang, {displayName}!
                </h1>
                <Badge variant="primary" className="text-[10px]">
                  Sesi Aktif
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Akun Anda terotentikasi dan siap untuk sesi latihan JLPT.
              </p>
            </div>
          </div>

          {/* Account Status Card (Minimal placeholder) */}
          <Card className="border border-white/10 bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary-400" />
                <span>Informasi Akun & Akses</span>
              </CardTitle>
              <CardDescription>
                Detail sesi dan status hak akses pengguna dari Supabase Auth & Profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/5 bg-white/5 p-3.5">
                  <span className="text-xs text-muted-foreground">Username</span>
                  <p className="mt-1 font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary-400" />
                    {displayName}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-3.5">
                  <span className="text-xs text-muted-foreground">Role Otoritas</span>
                  <p className="mt-1 font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="capitalize">{profile?.role || 'user'}</span>
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-3.5">
                  <span className="text-xs text-muted-foreground">Tier Langganan</span>
                  <p className="mt-1 font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-secondary-400" />
                    <span className="uppercase">{tierName}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-4 text-xs text-muted-foreground space-y-1.5">
                <div className="flex items-center gap-2 text-primary-300 font-medium">
                  <CheckCircle className="h-4 w-4 text-primary-400 shrink-0" />
                  <span>Autentikasi Supabase Berhasil Terverifikasi</span>
                </div>
                <p>
                  Ini adalah placeholder dashboard minimal untuk Step 6. Fitur analitik progress,
                  latihan per unit, dan materi lengkap akan dibangun pada langkah berikutnya.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}
