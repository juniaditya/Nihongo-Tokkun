import type { Database } from '@/types/database.types';
export type Subscription = Database['public']['Tables']['user_subscriptions']['Row'];
export const planLabels = { jlpt_intensive: 'JLPT Intensive', nihongo_regular: 'Nihongo Regular' };
export const jlptLevels = ['N5','N4','N3','N2','N1'];
export function subscriptionDate(date: string) {
  return new Intl.DateTimeFormat('id-ID',{dateStyle:'long',timeZone:'Asia/Makassar'}).format(new Date(date));
}
