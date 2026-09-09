'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from './auth';
import { resources, parseContent, uuidPattern, type ContentWriterDatabase } from './resources';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SaveState = { error?: string; success?: string; id?: string };
export async function saveContent(resourceKey: string, id: string | null, _state: SaveState, form: FormData): Promise<SaveState> {
  const { supabase } = await requireAdmin();
  const resource = resources[resourceKey];
  if (!resource || (id && !uuidPattern.test(id))) return {error:'Halaman tidak valid.'};
  try {
    const payload = parseContent(resource, form);
    if (resource.table === 'questions' || resource.table === 'flashcards') {
      const sourceKeys = resource.table === 'questions' ? ['kotoba_id','bunpou_id','passage_id'] : ['kotoba_id','bunpou_id'];
      const selected = sourceKeys.filter(key => payload[key]);
      if (selected.length !== 1) throw new Error('Pilih tepat satu sumber materi.');
      const sourceTable = selected[0] === 'kotoba_id' ? 'kotoba' : selected[0] === 'bunpou_id' ? 'bunpou' : 'dokkai_passages';
      const source = await supabase.from(sourceTable).select('lesson_id').eq('id',String(payload[selected[0]])).single();
      if (source.error || source.data?.lesson_id !== payload.lesson_id) throw new Error('Sumber materi harus berasal dari lesson yang dipilih.');
    }
    if (resource.table === 'questions' && payload.is_active) {
      if (!id) throw new Error('Simpan soal nonaktif, lengkapi empat opsi, lalu aktifkan.');
      const options = await supabase.from('question_options').select('is_correct,option_order').eq('question_id',id);
      if (options.error) throw options.error;
      if (options.data?.length !== 4 || options.data.filter(o=>o.is_correct).length !== 1 || options.data.some(o=>o.option_order<1||o.option_order>4)) throw new Error('Soal aktif harus memiliki 4 opsi dan tepat 1 jawaban benar.');
    }
    if (resource.table === 'question_options') {
      const parent = await supabase.from('questions').select('is_active').eq('id',String(payload.question_id)).single();
      if (parent.error) throw parent.error;
      if (parent.data.is_active) throw new Error('Nonaktifkan soal sebelum mengubah opsi jawaban.');
      if (id) {
        const old = await supabase.from('question_options').select('question_id').eq('id',id).single();
        if (old.error) throw old.error;
        if (old.data.question_id !== payload.question_id) throw new Error('Opsi tidak dapat dipindahkan ke soal lain.');
      }
    }
    if (resource.table === 'subscription_tiers' && id) {
      const old = await supabase.from('subscription_tiers').select('code').eq('id',id).single();
      if (old.error) throw old.error;
      if (old.data.code !== payload.code) throw new Error('Kode tier yang sudah ada tidak boleh diubah.');
    }
    const writer = supabase as unknown as SupabaseClient<ContentWriterDatabase>;
    const result = id
      ? await writer.from(resource.table).update(payload).eq('id',id).eq('updated_at',String(form.get('updated_at'))).select('id').maybeSingle()
      : await writer.from(resource.table).insert(payload).select('id').single();
    if (result.error) throw result.error;
    if (!result.data) throw new Error('Data telah berubah. Muat ulang sebelum menyimpan kembali.');
    revalidatePath('/', 'layout');
    return { success:'Perubahan disimpan.', id:result.data.id };
  } catch (error) {
    console.error('[Admin content]',error instanceof Error ? error.message : error);
    return { error: error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Gagal menyimpan data.' };
  }
}

export async function saveUser(id: string, _state: SaveState, form: FormData): Promise<SaveState> {
  const {supabase,user} = await requireAdmin();
  const username = String(form.get('username') ?? '').trim();
  const role = String(form.get('role'));
  const tierId = String(form.get('tier_id') ?? '');
  if (!uuidPattern.test(id) || !/^[a-zA-Z0-9_]{3,30}$/.test(username) || !['user','admin'].includes(role) || (tierId && !uuidPattern.test(tierId))) return {error:'Nama, role, atau tier tidak valid.'};
  if (id === user.id && role !== 'admin') return {error:'Anda tidak dapat menurunkan role akun sendiri.'};
  const result = await supabase.from('profiles').update({username,role:role as 'user'|'admin',tier_id:tierId||null}).eq('id',id).eq('updated_at',String(form.get('updated_at'))).select('id').maybeSingle();
  if (result.error) return {error:result.error.message};
  if (!result.data) return {error:'Data berubah. Muat ulang halaman sebelum menyimpan.'};
  revalidatePath('/', 'layout');
  return {success:'Pengguna diperbarui.'};
}
