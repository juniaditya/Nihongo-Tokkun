'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Trophy,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/ui/tooltip';
import { logout } from '@/lib/auth/actions';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  /** Exact match for active state */
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/courses', icon: BookOpen, label: 'Kursus' },
  { href: '/flashcard', icon: Layers, label: 'Flashcard' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/profile', icon: User, label: 'Profil' },
];

interface SidebarProps {
  username: string;
  role: string;
  tierCode: string;
}

export function Sidebar({ username, role, tierCode }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Load initial state from localStorage safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nihongo_tokkun_sidebar_collapsed');
      if (saved) {
        setCollapsed(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem('nihongo_tokkun_sidebar_collapsed', JSON.stringify(collapsed));
    } catch (e) {
      // ignore
    }
  }, [collapsed]);


  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside
      className={cn(
        'hidden app:flex flex-col fixed left-0 top-0 h-full z-30',
        'border-r border-white/8 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-out',
        collapsed ? 'w-[76px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-white/8 shrink-0',
          collapsed ? 'justify-center px-2' : 'px-5 gap-3'
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-glow">
            <span className="font-japanese text-base font-bold">特</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-heading text-base font-extrabold tracking-tight text-foreground">
                Nihongo{' '}
                <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                  Tokkun
                </span>
              </span>
              <span className="font-japanese text-[10px] text-muted-foreground">
                日本語特訓アプリ
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1" aria-label="Navigasi utama">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                active
                  ? 'bg-primary-500/15 text-primary-300 border border-primary-500/25 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/6',
                collapsed && 'justify-center px-2'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  active ? 'text-primary-400' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} content={item.label} position="right">
                {linkContent}
              </Tooltip>
            );
          }

          return linkContent;
        })}

        {/* Admin Link (Conditional) */}
        {role === 'admin' && (
          <>
            <div className={cn("mt-4 mb-2 border-t border-white/8", collapsed ? "mx-2" : "mx-4")} />
            {(() => {
              const adminHref = '/admin';
              const adminActive = pathname.startsWith(adminHref);
              const AdminIcon = LayoutDashboard; // Using LayoutDashboard for admin, can change if needed

              const adminLinkContent = (
                <Link
                  href={adminHref}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                    adminActive
                      ? 'bg-red-500/15 text-red-400 border border-red-500/25 shadow-sm'
                      : 'text-muted-foreground hover:text-red-400 hover:bg-red-500/5',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <AdminIcon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-colors',
                      adminActive ? 'text-red-400' : 'text-muted-foreground group-hover:text-red-400'
                    )}
                  />
                  {!collapsed && <span>Admin</span>}
                </Link>
              );

              return collapsed ? (
                <Tooltip content="Admin" position="right">
                  {adminLinkContent}
                </Tooltip>
              ) : adminLinkContent;
            })()}
          </>
        )}
      </nav>

      {/* User Card + Logout */}
      <div className="shrink-0 border-t border-white/8 p-2 space-y-1">
        {/* User info */}
        {!collapsed && (
          <div className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/6 px-3 py-2.5 mb-1">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary-500/60 to-secondary-500/60 flex items-center justify-center border border-white/10">
              <span className="text-xs font-bold text-white uppercase">
                {username.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{username}</p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {role === 'admin' ? 'Administrator' : 'Pelajar'} · {tierCode === 'premium' ? 'Premium' : 'Gratis'}
              </p>
            </div>
          </div>
        )}

        {/* Logout */}
        <form action={logout}>
          {collapsed ? (
            <Tooltip content="Keluar" position="right">
              <button
                type="submit"
                aria-label="Keluar dari akun"
                className="flex w-full items-center justify-center rounded-xl px-2 py-2.5 text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </Tooltip>
          ) : (
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Keluar</span>
            </button>
          )}
        </form>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        className={cn(
          'absolute -right-3 top-[72px] z-10',
          'flex h-6 w-6 items-center justify-center rounded-full',
          'border border-white/15 bg-background/90 text-muted-foreground shadow-md backdrop-blur-sm',
          'hover:text-foreground hover:border-primary-500/50 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </aside>
  );
}
