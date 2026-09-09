import {SubscriptionSummary} from '@/components/learning/subscription-summary';
import Link from 'next/link';
import {requireAdmin} from '@/lib/admin/auth';

export default async function UsersPage({searchParams}:{searchParams:Promise<{page?:string;q?:string}>}){
 const {supabase}=await requireAdmin();const search=await searchParams;const page=Math.max(1,Math.min(100000,Number(search.page)||1));const q=(search.q??'').trim().slice(0,100);
 let query=supabase.from('profiles').select('id,username,role,tier_id,created_at',{count:'exact'}).order('created_at',{ascending:false}).order('id').range((page-1)*30,page*30-1);
 if(q)query=query.ilike('username',`%${q.replace(/[%_]/g,'')}%`);
 const [users,tiers]=await Promise.all([query,supabase.from('subscription_tiers').select('id,name')]);
 if(users.error||tiers.error)throw new Error('Gagal memuat daftar pengguna.');
 const subscriptions=users.data?.length ? await supabase.from('user_subscriptions').select('*').in('user_id',users.data.map(u=>u.id)) : {data:[],error:null};
 if(subscriptions.error)throw new Error('Gagal memuat paket pengguna.');
 return <section className="space-y-4"><h2 className="text-xl font-bold">Pengguna</h2><form className="flex gap-2"><input name="q" aria-label="Cari pengguna" defaultValue={q} placeholder="Cari username…" className="min-w-0 flex-1 rounded-xl border border-border bg-background p-3"/><button className="px-4 border border-border rounded-xl">Cari</button></form>
 <p className="text-sm text-muted-foreground">{users.count} pengguna</p><ul className="space-y-3">{users.data?.map(user=><li key={user.id}><Link href={`/admin/users/${user.id}`} className="block border border-border rounded-xl p-4 break-words"><strong>{user.username||'Pelajar'}</strong><p className="text-sm text-muted-foreground">{user.role} · {tiers.data?.find(t=>t.id===user.tier_id)?.name??'Tanpa tier'} · Bergabung {new Date(user.created_at).toLocaleDateString('id-ID')}</p><SubscriptionSummary subscription={subscriptions.data?.find(s=>s.user_id===user.id)??null}/><span className="text-sm text-primary-500">Kelola pengguna →</span></Link></li>)}</ul>
 <div className="flex gap-5">{page>1&&<Link href={`?page=${page-1}&q=${encodeURIComponent(q)}`}>← Sebelumnya</Link>}{page*30<(users.count??0)&&<Link href={`?page=${page+1}&q=${encodeURIComponent(q)}`}>Berikutnya →</Link>}</div></section>;
}
