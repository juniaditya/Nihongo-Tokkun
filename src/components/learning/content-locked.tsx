import Link from 'next/link';
import { Lock } from 'lucide-react';
import { accessMessage, type ContentAccess } from '@/lib/content-access';

export function ContentLocked({ access }: { access: ContentAccess }) {
  return <section className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-10 text-center space-y-4">
    <Lock className="mx-auto h-10 w-10 text-primary-400" aria-hidden="true" />
    <h2 className="text-xl font-bold">Konten terkunci</h2>
    <p className="text-sm text-muted-foreground break-words">{accessMessage(access)}</p>
    <Link href="/profile" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">Lihat Paket Saya</Link>
  </section>;
}
