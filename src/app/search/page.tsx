import { getSearchCards } from "@/server/supabase/content";
import { SearchClient } from "./SearchClient";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cari Kotoba / Bunpou — 日本語特訓 N2" };

export default async function SearchPage() {
  try {
    const cards = await getSearchCards();
    return <SearchClient cards={cards} />;
  } catch (e) {
    return (
      <div className="panel fade-in">
        <h2 className="panel-title error-title"><AlertCircle size={20} /> Pencarian tidak dapat dimuat</h2>
        <p className="muted" style={{ marginTop: 12 }}>{e instanceof Error ? e.message : String(e)}</p>
      </div>
    );
  }
}
