import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireAdmin} from '@/lib/admin/auth';
import {resources} from '@/lib/admin/resources';

export default async function ContentList({params,searchParams}:{params:Promise<{resource:string}>;searchParams:Promise<{page?:string;q?:string;saved?:string}>}){
 const {supabase}=await requireAdmin();
 const {resource:key}=await params;const r=resources[key];if(!r)notFound();
 const search=await searchParams;const page=Math.max(1,Math.min(100000,Number(search.page)||1));const q=(search.q??'').trim().slice(0,100);
 let query=supabase.from(r.table).select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id').range((page-1)*30,page*30-1);
 if(q)query=query.ilike(r.titleKey,`%${q.replace(/[%_]/g,'')}%`);
 const result=await query;
 return <section className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">{r.label}</h2><Link href={`/admin/${key}/new`} className="rounded-xl bg-primary-600 px-4 py-2 text-white">Tambah {r.label}</Link></div>
 <form className="flex gap-2"><input aria-label="Cari konten" name="q" defaultValue={q} placeholder="Cari…" className="min-w-0 flex-1 rounded-xl border border-border bg-background p-3"/><button className="rounded-xl border border-border px-4">Cari</button></form>
 {result.error?<p role="alert">Data gagal dimuat: {result.error.message}</p>:<><p className="text-sm text-muted-foreground">{result.count} data · halaman {page}</p><ul className="space-y-2">{(result.data??[]).map(row=>{const item=row as unknown as Record<string,unknown>;return <li key={String(item.id)}><Link href={`/admin/${key}/${item.id}`} className="block rounded-xl border border-border p-4 hover:bg-primary-500/10 break-words"><span className="font-semibold font-jp">{String(item[r.titleKey]||`${r.label} ${item.number??''}`)}</span>{'is_active' in item&&<span className="ml-3 text-xs text-muted-foreground">{item.is_active?'Aktif':'Nonaktif'}</span>}<span className="block mt-1 text-xs text-muted-foreground">Edit →</span></Link></li>})}</ul>{result.data?.length===0&&<p>Belum ada data.</p>}<div className="flex gap-5">{page>1&&<Link href={`?page=${page-1}&q=${encodeURIComponent(q)}`}>← Sebelumnya</Link>}{page*30<(result.count??0)&&<Link href={`?page=${page+1}&q=${encodeURIComponent(q)}`}>Berikutnya →</Link>}</div></>}
 </section>;
}
