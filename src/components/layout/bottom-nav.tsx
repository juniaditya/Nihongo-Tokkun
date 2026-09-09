'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, ChartNoAxesCombined, Trophy, User } from 'lucide-react';
import { cn } from '@/utils/cn';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/courses', icon: BookOpen, label: 'Kursus' },
  { href: '/progress', icon: ChartNoAxesCombined, label: 'Progress' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/profile', icon: User, label: 'Profil' },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <nav
      className={cn(
        'app:hidden fixed bottom-0 left-0 right-0 z-30',
        'flex items-stretch border-t border-white/8',
        'bg-background/95 backdrop-blur-xl',
        /* safe area for iOS notch */
        'pb-[env(safe-area-inset-bottom,0px)]'
      )}
      aria-label="Navigasi bawah"
      style={{ height: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2',
              'text-[10px] font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
              active
                ? 'text-primary-400'
                : 'text-muted-foreground hover:text-foreground active:text-foreground'
            )}
            aria-current={active ? 'page' : undefined}
          >
            {/* Active indicator dot above icon */}
            <span
              className={cn(
                'relative flex items-center justify-center',
                active &&
                  'before:absolute before:-top-0.5 before:left-1/2 before:-translate-x-1/2 before:h-0.5 before:w-5 before:rounded-full before:bg-primary-400'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-transform duration-150',
                  active && 'scale-110'
                )}
              />
            </span>
            <span className="leading-none">{item.label}</span>
          </Link>
        );
      })}

    </nav>
  );
}
