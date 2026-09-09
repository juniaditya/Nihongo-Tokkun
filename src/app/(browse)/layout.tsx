import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { TopBar } from '@/components/layout/top-bar';
import type { Database } from '@/types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type SubscriptionTierRow = Database['public']['Tables']['subscription_tiers']['Row'];

/**
 * (browse) layout — auth-aware, accessible to both guests and authenticated users.
 *
 * Authenticated users: full Sidebar/TopBar/BottomNav with their real profile data.
 * Guest users: TopBar with "Masuk" prompt; no authenticated controls; no fake profile.
 *
 * The (app) layout retains a hard redirect for fully authenticated-only routes
 * like /dashboard, /profile, /admin, etc.
 */
export default async function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  // Only fetch profile data for authenticated users. Guests have no profile row.
  let username = '';
  let role = 'user';
  let tierCode = 'free';

  if (user) {
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
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Desktop Sidebar — shown only for authenticated users */}
      {isAuthenticated && (
        <Sidebar username={username} role={role} tierCode={tierCode} />
      )}

      {/* Mobile/Tablet TopBar — always shown below 900px */}
      <TopBar username={username} isAuthenticated={isAuthenticated} />

      {/* Main Content Area */}
      <main
        className={[
          'min-h-screen transition-all duration-300',
          /* desktop: offset by sidebar only if authenticated */
          isAuthenticated ? 'app:pl-[260px]' : 'app:pl-0',
          /* mobile: account for topbar */
          'pt-16 app:pt-0',
          /* mobile: account for bottom nav (only if authenticated) */
          isAuthenticated ? 'pb-[68px] app:pb-0' : 'pb-8',
        ].join(' ')}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation — only for authenticated users */}
      {isAuthenticated && <BottomNav />}
    </div>
  );
}
