'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { AdminField } from '@/lib/admin/resources';
import type { SaveState } from '@/lib/admin/actions';

export type Choice = {value:string;label:string};
export function EditorForm({fields, values, choices = {}, action, afterCreate}: {
  fields: AdminField[];
  values: Record<string, unknown>;
  choices?: Record<string, Choice[]>;
  action: (state:SaveState, form:FormData)=>Promise<SaveState>;
  afterCreate?: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  const router = useRouter();
  useEffect(()=>{ if(state.id && afterCreate) router.replace(`${afterCreate}/${state.id}?saved=1`); },[state.id,afterCreate,router]);
  const inputClass='w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500';
  return <form action={submit} className="space-y-5 max-w-3xl">
    <input type="hidden" name="updated_at" value={String(values.updated_at ?? '')}/>
    {fields.map(field=>{
      const value=values[field.key] ?? field.initial ?? '';
      const options=choices[field.key] ?? field.options?.map(option=>({value:option,label:option}));
      return <div key={field.key} className="space-y-2">
        <label htmlFor={`field-${field.key}`} className="block text-sm font-semibold">{field.label}{field.required?' *':''}</label>
        {field.type==='boolean' ? <input id={`field-${field.key}`} name={field.key} type="checkbox" defaultChecked={Boolean(value)} className="h-5 w-5 accent-indigo-500"/> : options ?
          <select id={`field-${field.key}`} name={field.key} required={field.required} defaultValue={String(value)} className={inputClass}><option value="">Pilih…</option>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type==='textarea' ?
          <textarea id={`field-${field.key}`} name={field.key} required={field.required} defaultValue={String(value)} rows={4} maxLength={20000} className={`${inputClass} font-jp`}/> :
          <input id={`field-${field.key}`} name={field.key} required={field.required} defaultValue={String(value)} type={field.type==='number'?'number':'text'} min={field.min} max={field.max} maxLength={20000} className={inputClass}/>
        }
      </div>;
    })}
    {state.error && <p role="alert" className="rounded-xl border border-rose-500/30 p-3 text-rose-500 break-words">{state.error}</p>}
    {state.success && <p role="status" className="text-emerald-500">{state.success}</p>}
    <Button type="submit" disabled={pending}>{pending?'Menyimpan…':'Simpan'}</Button>
  </form>;
}
