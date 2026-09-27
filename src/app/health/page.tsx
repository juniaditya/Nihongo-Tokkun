import { runHealthCheck } from "@/server/supabase/health";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Health Check — 日本語特訓 N2",
};

/**
 * Health Safety Decision (Phase 6B.2):
 *
 * Option B chosen — detailed production row counts are DEV-ONLY.
 * In production this route exposes only the ok/degraded status badge.
 *
 * Rationale: Row counts reveal data volume and content structure.
 * Until auth is implemented on this route, counts must not be public.
 * The badge is safe: it exposes no quantitative information.
 */
const IS_DEV = process.env.NODE_ENV === "development";

export default async function HealthPage() {
  let result: Awaited<ReturnType<typeof runHealthCheck>> | null = null;
  let fatalError: string | null = null;

  try {
    result = await runHealthCheck();
  } catch (e) {
    fatalError = e instanceof Error ? e.message : "Unknown error running health check.";
  }

  const statusBadge = fatalError
    ? "UNAVAILABLE"
    : result?.ok
    ? "OK"
    : "ERRORS";

  const badgeClass = fatalError
    ? "bg-slate-500/15 text-slate-400 border border-slate-500/30"
    : result?.ok
    ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
    : "bg-red-500/15 text-red-400 border border-red-500/30";

  return (
    <main className="flex-1 p-6 md:p-10 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Beranda
        </Link>
        <h1 className="text-2xl font-extrabold text-white">Database Health</h1>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
          {statusBadge}
        </span>
      </div>

      {fatalError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 mb-8 text-red-300 text-sm">
          <strong>Health check tidak tersedia.</strong>
          {IS_DEV && (
            <p className="mt-2 text-red-400/70 text-xs">
              Pastikan SUPABASE_URL dan SUPABASE_SECRET_KEY sudah dikonfigurasi di .env.local
            </p>
          )}
        </div>
      )}

      {!IS_DEV && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
          <p>Status database: <span className={`font-bold ${result?.ok ? "text-teal-400" : fatalError ? "text-slate-400" : "text-red-400"}`}>{statusBadge}</span></p>
          <p className="text-xs text-slate-600 mt-2">
            Detailed diagnostics: dev-only. Run locally with NODE_ENV=development.
          </p>
        </div>
      )}

      {IS_DEV && result && (
        <>
          <p className="text-slate-400 text-sm mb-6">
            Durasi: {result.durationMs}ms · Baseline: Phase 6A verified counts
          </p>

          {result.errors.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 mb-8">
              <h2 className="text-sm font-bold text-red-400 mb-2">Errors</h2>
              <ul className="text-xs text-red-300 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs uppercase tracking-widest text-slate-500 font-bold">Tabel</th>
                  <th className="text-right p-4 text-xs uppercase tracking-widest text-slate-500 font-bold">Aktual</th>
                  <th className="text-right p-4 text-xs uppercase tracking-widest text-slate-500 font-bold">Baseline</th>
                  <th className="text-right p-4 text-xs uppercase tracking-widest text-slate-500 font-bold">Delta</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.counts).map(([key, actual]) => {
                  const baseline = result!.baseline[key as keyof typeof result.baseline];
                  const delta = result!.deltas[key as keyof typeof result.deltas];
                  const ok = actual === -1 || actual >= baseline;
                  return (
                    <tr key={key} className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-slate-300 font-mono text-xs">{key}</td>
                      <td className={`p-4 text-right font-bold tabular-nums ${ok ? "text-white" : "text-red-400"}`}>
                        {actual === -1 ? "ERR" : actual.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-slate-500 tabular-nums">
                        {baseline.toLocaleString()}
                      </td>
                      <td className={`p-4 text-right text-xs tabular-nums ${
                        delta == null ? "text-slate-600" :
                        delta > 0 ? "text-teal-400" : "text-red-400"
                      }`}>
                        {delta == null ? "—" : delta > 0 ? `+${delta}` : `${delta}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {Object.keys(result.deltas).length > 0 && (
            <p className="text-xs text-slate-500 mt-4">
              Delta positif berarti lebih banyak baris dari baseline.
              Delta negatif berarti ada data yang hilang dari production.
            </p>
          )}
        </>
      )}
    </main>
  );
}
