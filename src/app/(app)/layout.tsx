import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { TopBar } from '@/components/layout/top-bar';
import type { Database } from '@/types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type SubscriptionTierRow = Database['public']['Tables']['subscription_tiers']['Row'];

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let username = 'Tamu';
  let role = 'user';
  let tierCode = 'free';

  const profileResult = await supabase
    .from('profiles')
    .select('username, role, tier_id')
    .eq('id', user.id)
    .maybeSingle();

  const profile = profileResult.data as Pick<
    ProfileRow,
    'username' | 'role' | 'tier_id'
  > | null;

  username =
    profile?.username ||
    (user.user_metadata?.username as string | undefined) ||
    user.email?.split('@')[0] ||
    'Pengguna';

  role = profile?.role ?? 'user';

  if (profile?.tier_id) {
    const tierResult = await supabase
      .from('subscription_tiers')
      .select('code')
      .eq('id', profile.tier_id)
      .maybeSingle();

    const tier = tierResult.data as Pick<SubscriptionTierRow, 'code'> | null;
    if (tier?.code) {
      tierCode = tier.code;
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Desktop Sidebar — visible ≥900px */}
      <Sidebar username={username} role={role} tierCode={tierCode} />

      {/* Mobile/Tablet TopBar — visible <900px */}
      <TopBar username={username} isAuthenticated={true} />

      {/* Main Content Area
          - Desktop: offset left by sidebar width (260px)
          - Mobile: account for topbar (64px) and bottom nav (68px)
      */}
      <main
        className={[
          'min-h-screen transition-all duration-300',
          /* desktop: push right of sidebar */
          'app:pl-[260px]',
          /* mobile: account for topbar */
          'pt-16 app:pt-0',
          /* mobile: account for bottom nav */
          'pb-[68px] app:pb-0',
        ].join(' ')}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation — hidden ≥900px */}
      <BottomNav role={role} />
    </div>
  );
}
