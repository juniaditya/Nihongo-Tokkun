import { getSupabaseClient } from '@/server/supabase/client';
import { getRuntimeUsername } from '@/server/runtimeUser';

function writesEnabled() {
  return String(process.env.ENABLE_PERSONAL_WRITES || '').toLowerCase() === 'true';
}

function clean(value: unknown, label: string, required: boolean, maxLength: number) {
  const text = String(value ?? '').trim();
  if (required && !text) throw new Error(`${label} wajib diisi.`);
  if (text.length > maxLength) throw new Error(`${label} maksimal ${maxLength} karakter.`);
  return text;
}

export async function POST(request: Request) {
  if (!writesEnabled()) {
    return Response.json({ ok: false, error: 'WRITE_DISABLED' }, { status: 503 });
  }

  try {
    const payload = await request.json() as Record<string, unknown>;
    const type = String(payload?.type ?? '');
    const username = await getRuntimeUsername();
    const sb = getSupabaseClient();

    if (type === 'kotoba') {
      const kotoba = clean(payload.kotoba, 'Kotoba', true, 200);
      const caraBaca = clean(payload.caraBaca, 'Cara Baca', false, 300);
      const arti = clean(payload.arti, 'Arti', true, 1000);
      const penjelasan = clean(payload.penjelasan, 'Penjelasan', false, 3000);
      const cardId = `uk-${crypto.randomUUID()}`;

      const { error } = await sb.from('user_kotoba').insert({
        card_id: cardId,
        username,
        kotoba,
        cara_baca: caraBaca,
        arti,
        penjelasan,
      });
      if (error) throw new Error(error.message);

      return Response.json({
        ok: true,
        type,
        card: { id: cardId, kotoba, caraBaca, arti, penjelasan },
        fsrs: { status: 'NEW', message: 'Kartu masuk Kotoba Tambahan. Rating pertama akan memasukkannya ke antrean FSRS.' },
      });
    }

    if (type === 'bunpou') {
      const bunpou = clean(payload.bunpou, 'Bunpou', true, 300);
      const arti = clean(payload.arti, 'Bahasa Indonesia', true, 1000);
      const fungsi = clean(payload.fungsi, 'Fungsi', false, 2000);
      const perbedaanKunci = clean(payload.perbedaanKunci, 'Perbedaan Kunci', false, 2000);
      const rumus = clean(payload.rumus, 'Rumus', false, 1000);
      const contohKalimat = clean(payload.contohKalimat, 'Contoh Kalimat', false, 3000);
      const cardId = `ub-${crypto.randomUUID()}`;

      const { error } = await sb.from('user_bunpou').insert({
        card_id: cardId,
        username,
        bunpou,
        bahasa_indonesia: arti,
        fungsi,
        perbedaan_kunci: perbedaanKunci,
        rumus,
        contoh_kalimat: contohKalimat,
      });
      if (error) throw new Error(error.message);

      return Response.json({
        ok: true,
        type,
        card: { id: cardId, bunpou, arti, fungsi, perbedaanKunci, rumus, contohKalimat },
      });
    }

    return Response.json({ ok: false, error: 'INVALID_MATERIAL_TYPE' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'AUTH_REQUIRED') return Response.json({ ok: false, error: 'AUTH_REQUIRED' }, { status: 401 });
    if (message === 'PROFILE_NOT_LINKED') return Response.json({ ok: false, error: 'PROFILE_NOT_LINKED' }, { status: 403 });
    return Response.json({ ok: false, error: 'SAVE_USER_MATERIAL_FAILED', message }, { status: 400 });
  }
}
