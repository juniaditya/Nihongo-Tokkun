'use client';

import { useState } from 'react';

type MaterialType = 'kotoba' | 'bunpou';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface KotobaDraft {
  kotoba: string;
  caraBaca: string;
  arti: string;
  penjelasan: string;
}

interface BunpouDraft {
  bunpou: string;
  arti: string;
  fungsi: string;
  perbedaanKunci: string;
  rumus: string;
  contohKalimat: string;
}

const EMPTY_KOTOBA: KotobaDraft = { kotoba: '', caraBaca: '', arti: '', penjelasan: '' };
const EMPTY_BUNPOU: BunpouDraft = { bunpou: '', arti: '', fungsi: '', perbedaanKunci: '', rumus: '', contohKalimat: '' };

export function NewMaterialPanel() {
  const [expanded, setExpanded] = useState(false);
  const [type, setType] = useState<MaterialType>('kotoba');
  const [kotoba, setKotoba] = useState<KotobaDraft>(EMPTY_KOTOBA);
  const [bunpou, setBunpou] = useState<BunpouDraft>(EMPTY_BUNPOU);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');

  async function saveMaterial() {
    if (saveState === 'saving') return;
    setSaveState('saving');
    setMessage('Menyimpan materi pribadi...');

    const payload = type === 'kotoba'
      ? { type, ...kotoba }
      : { type, ...bunpou };

    try {
      const response = await fetch('/api/user-material', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);

      setSaveState('saved');
      setMessage(type === 'kotoba'
        ? 'Kotoba tersimpan. Buka Kotoba Tambahan untuk memberi rating pertama dan memasukkannya ke FSRS.'
        : 'Bunpou tersimpan di Bunpou Tambahan.');
      if (type === 'kotoba') setKotoba(EMPTY_KOTOBA);
      else setBunpou(EMPTY_BUNPOU);
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="new-material-shell">
      <button
        type="button"
        className="new-material-toggle"
        aria-expanded={expanded}
        onClick={() => {
          setExpanded((value) => !value);
          setSaveState('idle');
          setMessage('');
        }}
      >
        {expanded ? '− Tutup Catatan Materi' : '＋ Catat Kotoba / Bunpou'}
      </button>

      {expanded && (
        <div className="new-material-panel">
          <div className="new-material-head">
            <div>
              <strong>Materi Tambahan Pribadi</strong>
              <p>Hanya tersimpan untuk akun yang sedang login dan tidak mengubah materi kursus resmi.</p>
            </div>
            <div className="material-tabs" role="tablist" aria-label="Jenis materi tambahan">
              <button type="button" className={type === 'kotoba' ? 'active' : ''} onClick={() => { setType('kotoba'); setSaveState('idle'); setMessage(''); }}>Kotoba</button>
              <button type="button" className={type === 'bunpou' ? 'active' : ''} onClick={() => { setType('bunpou'); setSaveState('idle'); setMessage(''); }}>Bunpou</button>
            </div>
          </div>

          {type === 'kotoba' ? (
            <div className="material-form-grid">
              <label>Kotoba *<input value={kotoba.kotoba} maxLength={200} onChange={(e) => setKotoba((v) => ({ ...v, kotoba: e.target.value }))} placeholder="例：収穫" /></label>
              <label>Cara Baca<input value={kotoba.caraBaca} maxLength={300} onChange={(e) => setKotoba((v) => ({ ...v, caraBaca: e.target.value }))} placeholder="しゅうかく" /></label>
              <label>Arti *<input value={kotoba.arti} maxLength={1000} onChange={(e) => setKotoba((v) => ({ ...v, arti: e.target.value }))} placeholder="panen; hasil panen" /></label>
              <label className="material-form-wide">Penjelasan<textarea rows={3} value={kotoba.penjelasan} maxLength={3000} onChange={(e) => setKotoba((v) => ({ ...v, penjelasan: e.target.value }))} placeholder="Catatan penggunaan, nuansa, atau contoh singkat." /></label>
            </div>
          ) : (
            <div className="material-form-grid">
              <label>Bunpou *<input value={bunpou.bunpou} maxLength={300} onChange={(e) => setBunpou((v) => ({ ...v, bunpou: e.target.value }))} placeholder="例：〜に違いない" /></label>
              <label>Bahasa Indonesia *<input value={bunpou.arti} maxLength={1000} onChange={(e) => setBunpou((v) => ({ ...v, arti: e.target.value }))} placeholder="pasti; tidak diragukan lagi" /></label>
              <label>Fungsi<textarea rows={2} value={bunpou.fungsi} maxLength={2000} onChange={(e) => setBunpou((v) => ({ ...v, fungsi: e.target.value }))} /></label>
              <label>Perbedaan Kunci<textarea rows={2} value={bunpou.perbedaanKunci} maxLength={2000} onChange={(e) => setBunpou((v) => ({ ...v, perbedaanKunci: e.target.value }))} /></label>
              <label>Rumus<input value={bunpou.rumus} maxLength={1000} onChange={(e) => setBunpou((v) => ({ ...v, rumus: e.target.value }))} /></label>
              <label>Contoh Kalimat<textarea rows={2} value={bunpou.contohKalimat} maxLength={3000} onChange={(e) => setBunpou((v) => ({ ...v, contohKalimat: e.target.value }))} /></label>
            </div>
          )}

          <div className="new-material-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={saveState === 'saving'}
              onClick={() => void saveMaterial()}
            >
              {saveState === 'saving' ? 'Menyimpan…' : `Simpan ${type === 'kotoba' ? 'Kotoba' : 'Bunpou'}`}
            </button>
            {message && <p className={`new-material-status ${saveState}`}>{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
