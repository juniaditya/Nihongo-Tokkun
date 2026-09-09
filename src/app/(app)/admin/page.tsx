import {requireAdmin} from '@/lib/admin/auth';

export default async function AdminPage(){
 const {supabase}=await requireAdmin();
 const tables=['profiles','courses','lessons','kotoba','bunpou','questions','flashcards','practice_sessions'] as const;
 const labels=['Pengguna','Kursus','Lesson','Kotoba','Bunpou','Soal','Flashcard','Sesi latihan'];
 const results=await Promise.all(tables.map(table=>supabase.from(table).select('*',{count:'exact',head:true})));
 return <section aria-label="Ringkasan admin" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{results.map((r,i)=><div key={tables[i]} className="rounded-2xl border border-border bg-white/5 p-5"><h2 className="text-sm text-muted-foreground">Total {labels[i]}</h2>{r.error?<p role="alert">Gagal memuat jumlah.</p>:<p className="text-3xl font-bold mt-3">{r.count??0}</p>}</div>)}</section>;
}
