import { getDashboardSummary } from "@/server/supabase/dashboard";
import { DashboardClient } from "@/features/dashboard/DashboardClient";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const summary = await getDashboardSummary();
    return <DashboardClient summary={summary} />;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error loading dashboard data.";
    return (
      <div className="panel fade-in">
        <h2 className="panel-title error-title"><AlertCircle size={20} /> Dashboard tidak dapat dimuat</h2>
        <p className="muted" style={{ marginTop: 12 }}>{message}</p>
      </div>
    );
  }
}
