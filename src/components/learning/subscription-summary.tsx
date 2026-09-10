import { planLabels, subscriptionDate, type Subscription } from '@/lib/subscriptions';

export function SubscriptionSummary({ subscription }: { subscription: Subscription | null }) {
  if (!subscription) return <p className="text-sm text-muted-foreground">Belum ada paket yang ditetapkan.</p>;
  const expired = subscription.expires_at && new Date(subscription.expires_at).getTime() < Date.now();
  const scheduled = new Date(subscription.started_at).getTime() > Date.now();
  return <dl className="grid gap-3 text-sm sm:grid-cols-2">
    <div><dt className="text-muted-foreground">Plan</dt><dd className="font-semibold">{planLabels[subscription.plan_type]}</dd></div>
    {subscription.jlpt_level && <div><dt className="text-muted-foreground">Target JLPT</dt><dd>{subscription.jlpt_level}</dd></div>}
    <div><dt className="text-muted-foreground">Mulai</dt><dd>{subscriptionDate(subscription.started_at)}</dd></div>
    <div><dt className="text-muted-foreground">Aktif sampai</dt><dd>{subscription.expires_at ? subscriptionDate(subscription.expires_at) : 'Tanpa batas'}</dd></div>
    <div><dt className="text-muted-foreground">Status paket</dt><dd>{expired ? 'Berakhir' : scheduled ? 'Belum dimulai' : 'Aktif'}</dd></div>
  </dl>;
}
