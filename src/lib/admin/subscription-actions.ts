'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from './auth';
import { uuidPattern } from './resources';
import { jlptLevels } from '@/lib/subscriptions';
import type { SaveState } from './actions';

export async function assignSubscription(userId: string, _state: SaveState, form: FormData): Promise<SaveState> {
  const {supabase} = await requireAdmin();
  const plan = String(form.get('plan_type'));
  const levels = form.getAll('jlpt_level');
  const level = String(levels[0] ?? '');
  const date = String(form.get('started_at'));
  if (!uuidPattern.test(userId) || !['jlpt_intensive','nihongo_regular'].includes(plan)) return {error:'Paket tidak valid.'};
  if (plan === 'jlpt_intensive' && (levels.length !== 1 || !jlptLevels.includes(level))) return {error:'JLPT Intensive wajib memiliki tepat satu level JLPT.'};
  const startedAt = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(startedAt.getTime()) || startedAt.toISOString().slice(0,10) !== date) return {error:'Tanggal mulai tidak valid.'};
  const result = await supabase.from('user_subscriptions').upsert({user_id:userId,plan_type:plan as 'jlpt_intensive'|'nihongo_regular',jlpt_level:plan==='jlpt_intensive'?level:null,started_at:startedAt.toISOString()});
  if (result.error) return {error:result.error.message};
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/profile');
  return {success:'Paket langganan disimpan.'};
}
