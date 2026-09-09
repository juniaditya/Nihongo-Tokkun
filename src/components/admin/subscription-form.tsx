'use client';
import { useActionState, useState } from 'react';
import { assignSubscription } from '@/lib/admin/subscription-actions';
import { jlptLevels, planLabels, type Subscription } from '@/lib/subscriptions';

export function SubscriptionForm({userId,subscription,today}:{userId:string;subscription:Subscription|null;today:string}) {
  const [plan,setPlan] = useState(subscription?.plan_type ?? 'jlpt_intensive');
  const [state,action,pending] = useActionState(assignSubscription.bind(null,userId),{});
  const input = 'mt-1 w-full rounded-xl border border-border bg-background p-3';
  return <form action={action} className="max-w-xl space-y-4">
    <label className="block">Paket langganan<select className={input} name="plan_type" value={plan} onChange={e=>setPlan(e.target.value as typeof plan)}>{Object.entries(planLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    {plan==='jlpt_intensive' && <label className="block">Target JLPT (satu level)<select className={input} name="jlpt_level" required defaultValue={subscription?.jlpt_level ?? ''}><option value="">Pilih level…</option>{jlptLevels.map(level=><option key={level}>{level}</option>)}</select></label>}
    <label className="block">Tanggal mulai<input className={input} type="date" name="started_at" required defaultValue={subscription?.started_at.slice(0,10) ?? today}/></label>
    {plan==='jlpt_intensive' && <p className="text-sm text-muted-foreground">Paket berlaku selama 4 bulan sejak tanggal mulai.</p>}
    {state.error && <p role="alert" className="text-red-500">{state.error}</p>}
    {state.success && <p role="status" className="text-emerald-500">{state.success}</p>}
    <button disabled={pending} className="rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending?'Menyimpan…':'Simpan Paket'}</button>
  </form>;
}
