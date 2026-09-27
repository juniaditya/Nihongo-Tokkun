"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, LogOut, LayoutDashboard, BookOpen, Search, X } from "lucide-react";

export function AppShell({
  children,
  displayName = "User",
  username = "",
  role = null,
}: {
  children: React.ReactNode;
  displayName?: string;
  username?: string;
  role?: "admin" | "user" | null;
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("n2-theme");
    const next = saved === "light" || saved === "dark" ? saved : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("n2-theme", theme);
  }, [theme]);

  useEffect(() => {
    setSidebarOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);


  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/auth/signout", { method: "POST" });
    } finally {
      window.location.replace("/login");
    }
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, active: pathname === "/" },
    { name: "Kursus", href: "/courses", icon: BookOpen, active: pathname.startsWith("/courses") || pathname.startsWith("/lessons") || pathname.startsWith("/quiz") || pathname.startsWith("/flashcards") || pathname.startsWith("/review") },
    { name: "Cari Kotoba", href: "/search", icon: Search, active: pathname.startsWith("/search") },
  ];

  return (
    <div className="app" id="appRoot">
      {sidebarOpen && <button id="sidebarBackdrop" className="sidebar-backdrop-button" onClick={() => setSidebarOpen(false)} aria-label="Tutup navigasi" />}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen((v) => !v)} aria-label="Buka navigasi"><Menu /></button>

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} id="sidebar">
        <div className="sidebar-head">
          <div>
            <h1>日本語特訓<span>N2 PREPARATION</span></h1>
            <p className="tagline"><span id="globalProgress">Supabase Runtime</span></p>
          </div>
          <button className="sidebar-close-mobile" onClick={() => setSidebarOpen(false)} aria-label="Tutup"><X size={18} /></button>
        </div>

        <div className="home-nav" id="sidebarNav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-btn-item ${item.active ? "active" : ""}`}>
              <item.icon /> {item.name}
            </Link>
          ))}
        </div>

        <div className="sidebar-foot">
          <div className="sidebar-profile">
            <span className="profile-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
            <span className="profile-copy">
              <span className="profile-username">{displayName}</span>
              <span className="profile-role">{role === "admin" ? "Admin" : username || "Student"}</span>
            </span>
          </div>
          <p className="src-note">Data runtime langsung dari Supabase</p>
        </div>
      </aside>

      <div className="main-shell">
        <header className="top-header">
          <div className="top-header-title">JLPT N2</div>
          <div className="top-header-actions hidden md:flex">
            <button className="header-action" onClick={() => setTheme((v) => v === "dark" ? "light" : "dark")} title="Ganti tema">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} Tema
            </button>
            <button className="header-action" type="button" onClick={handleLogout} disabled={loggingOut}>
              <LogOut size={16} /> {loggingOut ? "Keluar..." : "Keluar Akun"}
            </button>
          </div>
          <div className="mobile-menu-wrap md:hidden block">
            <button className="header-action mobile-menu-trigger" onClick={() => setMobileMenuOpen((v) => !v)} aria-expanded={mobileMenuOpen}><Menu size={16} /></button>
            {mobileMenuOpen && (
              <div className="mobile-header-menu open">
                <div className="mobile-profile">
                  <span className="profile-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
                  <span className="profile-copy"><span className="profile-username">{displayName}</span><span className="profile-role">{role === "admin" ? "Admin" : username}</span></span>
                </div>
                <button className="header-action w-full" onClick={() => setTheme("light")}><Sun size={16} /> Tema Terang</button>
                <button className="header-action w-full" onClick={() => setTheme("dark")}><Moon size={16} /> Tema Gelap</button>
                <button className="header-action w-full" onClick={handleLogout} disabled={loggingOut}><LogOut size={16} /> {loggingOut ? "Keluar..." : "Keluar Akun"}</button>
              </div>
            )}
          </div>
        </header>
        <main className="content" id="content">{children}</main>
      </div>

      <nav className="mobile-bottom-nav md:hidden" id="mobileBottomNav">
        <div className="mob-nav-inner flex justify-around w-full">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`mob-nav-btn ${item.active ? "active" : ""}`}>
              <span className="mob-icon"><item.icon size={20} /></span><span>{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
