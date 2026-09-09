import {notFound} from 'next/navigation';
import {requireAdmin} from '@/lib/admin/auth';
import {saveUser} from '@/lib/admin/actions';
import {uuidPattern} from '@/lib/admin/resources';
import {EditorForm} from '@/components/admin/editor-form';

export default async function UserEditor({params}:{params:Promise<{id:string}>}){
 const {supabase}=await requireAdmin();const {id}=await params;if(!uuidPattern.test(id))notFound();
 const [profile,tiers]=await Promise.all([supabase.from('profiles').select('*').eq('id',id).maybeSingle(),supabase.from('subscription_tiers').select('id,name').order('sort_order')]);
 if(profile.error||tiers.error)throw new Error('Gagal memuat pengguna.');if(!profile.data)notFound();
 return <section className="space-y-5"><h2 className="text-xl font-bold">Kelola pengguna</h2><p className="text-sm text-muted-foreground">Bergabung {new Date(profile.data.created_at).toLocaleDateString('id-ID')}</p>
 <EditorForm key={profile.data.updated_at} values={profile.data} fields={[{key:'username',label:'Username',required:true},{key:'role',label:'Role',type:'select',options:['user','admin'],required:true},{key:'tier_id',label:'Tier langganan',type:'select'}]} choices={{tier_id:(tiers.data??[]).map(t=>({value:t.id,label:t.name}))}} action={saveUser.bind(null,id)}/>
 </section>;
}
