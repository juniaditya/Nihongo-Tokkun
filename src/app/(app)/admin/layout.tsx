import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { resources } from '@/lib/admin/resources';

export default async function AdminLayout({children}:{children:React.ReactNode}) {
  await requireAdmin();
  return <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
    <header><h1 className="text-2xl font-bold">Administrasi</h1><p className="mt-2 text-muted-foreground">Kelola materi dan pengguna Nihongo Tokkun.</p></header>
    <nav aria-label="Navigasi admin" className="flex flex-wrap gap-2 text-sm">
      {[['','Ringkasan'],['users','Pengguna'],...Object.entries(resources).map(([key,r])=>[key,r.label])].map(([key,label])=><Link key={key} href={`/admin${key?`/${key}`:''}`} className="rounded-lg border border-border px-3 py-2 hover:bg-primary-500/10 focus-visible:ring-2 focus-visible:ring-primary-500">{label}</Link>)}
    </nav>{children}
  </div>;
}
