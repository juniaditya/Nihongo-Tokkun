import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireAdmin} from '@/lib/admin/auth';
import {resources,uuidPattern} from '@/lib/admin/resources';
import {saveContent} from '@/lib/admin/actions';
import {EditorForm,type Choice} from '@/components/admin/editor-form';
import {readAll} from '@/lib/learning-progress';

export default async function ContentEditor({params,searchParams}:{params:Promise<{resource:string;id:string}>;searchParams:Promise<{saved?:string}>}){
 const {supabase}=await requireAdmin();const {resource:key,id}=await params;const r=resources[key];
 if(!r || (id!=='new'&&!uuidPattern.test(id)))notFound();
 let values:Record<string,unknown>={};
 if(id!=='new'){
  const result=await supabase.from(r.table).select('*').eq('id',id).maybeSingle();
  if(result.error)throw new Error('Gagal memuat konten.');if(!result.data)notFound();values=result.data;
 }
 const choices:Record<string,Choice[]>={};
 await Promise.all(r.fields.filter(f=>f.reference).map(async field=>{
  const table=field.reference!;
  const rows=await readAll<Record<string,unknown>>((from,to)=>supabase.from(table).select('*').order('id').range(from,to));
  choices[field.key]=rows.map(row=>({value:String(row.id),label:String(row.name||row.title||row.word||row.grammar||row.question_text||row.passage_title||`${row.category??'Materi'} ${row.number??''}`).slice(0,120)}));
 }));
 return <section className="space-y-5"><Link href={`/admin/${key}`} className="text-primary-500">← {r.label}</Link><h2 className="text-xl font-bold">{id==='new'?'Tambah':'Edit'} {r.label}</h2>
 {(await searchParams).saved&&<p role="status">Data berhasil ditambahkan.</p>}
 {r.table==='questions'&&<p className="text-sm text-muted-foreground">Simpan nonaktif, buat 4 opsi dengan tepat 1 jawaban benar di Opsi jawaban, lalu aktifkan soal.</p>}
 {(r.table==='questions'||r.table==='flashcards')&&<p className="text-sm text-muted-foreground">Pilih tepat satu sumber materi dari lesson yang sama.</p>}
 <EditorForm key={String(values.updated_at??'new')} fields={r.fields} values={values} choices={choices} action={saveContent.bind(null,key,id==='new'?null:id)} afterCreate={id==='new'?`/admin/${key}`:undefined}/>
 </section>;
}
