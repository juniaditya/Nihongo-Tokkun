import { BookOpen } from "lucide-react";

interface SectionPickerProps {
  lessonLabel: string;
  sections: string[];
  totalQuestions: number;
  onSelectSection: (section: string | null) => void;
}

/** Maps raw DB section keys to readable labels */
function formatSection(section: string): string {
  const map: Record<string, string> = {
    arti: "Arti",
    cara_baca: "Cara Baca",
    penggunaan: "Penggunaan dalam Kalimat",
    yohou: "用法",
    ruigigo: "類義語・使い分け",
    arti_fungsi: "Arti & Fungsi",
    bentuk_koneksi: "Bentuk Koneksi",
    perbedaan_grammar: "Perbedaan Grammar",
    penggunaan_kalimat: "Penggunaan Kalimat",
    tanbun: "Tanbun (短文)",
    chuubun: "Chuubun (中文)",
    tougou: "Tougou (統合)",
    chobun: "Chobun (長文)",
    jouhou: "Jouhou (情報)",
    latihan: "Latihan",
  };
  return map[section] ?? section;
}

export function SectionPicker({
  lessonLabel,
  sections,
  totalQuestions,
  onSelectSection,
}: SectionPickerProps) {
  return (
    <div className="max-w-lg mx-auto">
      <p className="text-sm text-slate-400 mb-2">Pilih bagian untuk dilatih:</p>
      <h2 className="text-lg font-bold text-white mb-6">{lessonLabel}</h2>

      <div className="space-y-2 mb-6">
        {/* All sections option */}
        <button
          id="section-all"
          type="button"
          onClick={() => onSelectSection(null)}
          className="w-full text-left px-4 py-3 rounded-xl border border-teal-500/30
                     bg-teal-500/[0.06] text-teal-200 text-sm font-medium
                     hover:border-teal-500/50 hover:bg-teal-500/10 transition-all
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <span className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>
              Semua Bagian
              <span className="ml-2 text-xs text-teal-400/70 tabular-nums">
                ({totalQuestions} soal)
              </span>
            </span>
          </span>
        </button>

        {/* Individual sections */}
        {sections.map((sec) => (
          <button
            key={sec}
            id={`section-${sec}`}
            type="button"
            onClick={() => onSelectSection(sec)}
            className="w-full text-left px-4 py-3 rounded-xl border border-white/10
                       bg-white/[0.03] text-slate-200 text-sm
                       hover:border-white/25 hover:bg-white/[0.06] transition-all
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            {formatSection(sec)}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-600">
        Pilih bagian tertentu untuk berlatih secara terfokus,
        atau pilih semua bagian untuk latihan lengkap.
      </p>
    </div>
  );
}
