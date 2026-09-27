import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getOptionalRuntimeProfile } from "@/server/runtimeUser";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const notoSansJp = Noto_Sans_JP({ variable: "--font-jp", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "日本語特訓 N2 — JLPT Study Workspace",
  description: "Learn JLPT N2 Japanese with Kotoba, Bunpou, Dokkai, quiz history, and spaced repetition.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let profile: Awaited<ReturnType<typeof getOptionalRuntimeProfile>> = null;
  try {
    profile = await getOptionalRuntimeProfile();
  } catch {
    // Login page should still render even when auth/profile configuration is incomplete.
  }

  return (
    <html lang="id" className={`${inter.variable} ${notoSansJp.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppShell
          username={profile?.username ?? ""}
          displayName={profile?.displayName ?? "User"}
          role={profile?.role ?? null}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
