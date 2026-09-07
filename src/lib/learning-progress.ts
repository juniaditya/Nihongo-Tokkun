import type { Database } from '@/types/database.types';

export type LessonStatus = Database['public']['Tables']['lesson_progress']['Row']['status'];
export type LessonProgress = Pick<Database['public']['Tables']['lesson_progress']['Row'], 'lesson_id' | 'status' | 'updated_at'>;

// Paginate to avoid truncating a learner's summary at the API row limit.
export async function readAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{
  data: T[] | null; error: { message: string } | null;
}>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await fetchPage(from, from + 499);
    if (result.error) throw new Error(result.error.message);
    rows.push(...(result.data ?? []));
    if (!result.data || result.data.length < 500) return rows;
  }
}

export const lessonStatusLabels: Record<LessonStatus, string> = {
  not_started: 'Belum mulai', in_progress: 'Sedang dipelajari', completed: 'Selesai',
};

export function questionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    cara_baca: 'Cara Baca Kanji', cara_pakai: 'Cara Pakai', sinonim: 'Sinonim',
    grammar_choice: 'Pilihan Tata Bahasa', penggunaan_kalimat: 'Penggunaan Kalimat',
    arti_fungsi: 'Arti dan Fungsi', bentuk_koneksi: 'Bentuk dan Sambungan', perbedaan_grammar: 'Perbedaan Tata Bahasa',
    arti: 'Arti Kata', fill_in: 'Isi Kosong', ordering: 'Urutan Kalimat', comprehension: 'Pemahaman',
    meaning: 'Arti', reading: 'Cara Baca', usage: 'Penggunaan', context: 'Konteks', synonym: 'Sinonim',
    '意味': 'Arti', '読み方': 'Cara Baca', '用法': 'Penggunaan', '文脈': 'Konteks',
    '類義語・使い分け': 'Sinonim dan Penggunaan', '文法の意味': 'Arti Tata Bahasa',
    '文脈穴埋め': 'Melengkapi Kalimat', '使い分け': 'Perbedaan Penggunaan',
    '文章の文法': 'Tata Bahasa dalam Teks', '文の組み立て': 'Susunan Kalimat',
    '内容理解': 'Pemahaman Isi', '理由理解': 'Pemahaman Alasan', '指示語': 'Kata Rujukan',
    '筆者の主張': 'Pendapat Penulis', '文脈理解': 'Pemahaman Konteks',
    '情報検索': 'Mencari Informasi', '統合理解': 'Pemahaman Terpadu',
  };
  return labels[type] ?? 'Latihan';
}
