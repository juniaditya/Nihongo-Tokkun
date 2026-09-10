import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface ContentAccess {
  allowed: boolean;
  full_access: boolean;
  reason: string | null;
  jlpt_level?: string;
}

export async function getContentAccess(courseId: string, lessonId?: string): Promise<ContentAccess> {
  const db = await createClient() as unknown as SupabaseClient<Database>;
  const { data, error } = await db.rpc('get_content_access', {
    p_course_id: courseId, p_lesson_id: lessonId ?? null,
  });
  if (error) {
    console.error('[Content access]', error.message);
    return { allowed: false, full_access: false, reason: 'unavailable' };
  }
  return data as unknown as ContentAccess;
}

export function accessMessage(access: ContentAccess): string {
  switch (access.reason) {
    case 'level_not_included': return `Paket Anda hanya mencakup JLPT ${access.jlpt_level ?? 'yang dipilih'}.`;
    case 'expired': return 'Langganan Anda telah berakhir.';
    case 'not_started': return 'Masa langganan Anda belum dimulai.';
    case 'not_found': return 'Konten ini belum tersedia.';
    case 'unavailable': return 'Akses belum dapat diperiksa. Silakan muat ulang halaman.';
    default: return 'Paket langganan diperlukan untuk membuka konten ini.';
  }
}
