"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import type { SearchCard } from "@/lib/types";

type Filter = 'all' | 'kotoba' | 'bunpou';

export function SearchClient({ cards }: { cards: SearchCard[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>('all');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ja-JP');
    let list = filter === 'all' ? cards : cards.filter((x) => x.category === filter);
    if (q) {
      list = list.filter((item) => {
        const haystack = [item.front, ...item.fields.map((f) => f.value)].join('\n').toLocaleLowerCase('ja-JP');
        return haystack.includes(q);
      });
    }
    return list.slice().sort((a, b) => {
      if (q) {
        const aExact = a.front.toLocaleLowerCase('ja-JP') === q ? 0 : 1;
        const bExact = b.front.toLocaleLowerCase('ja-JP') === q ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
      }
      return a.front.localeCompare(b.front, 'ja');
    });
  }, [cards, query, filter]);

  const shown = results.slice(0, 200);

  return (
    <div className="panel fade-in">
      <h2 className="panel-title">🔍 Cari Kotoba / Bunpou</h2>
      <div className="search-view-bar search-input-wrap">
        <Search size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpenKey(null); }}
          placeholder="Ketik kata (mis. 頑張る), arti, cara baca, atau pola tata bahasa..."
          autoFocus
        />
      </div>
      <div className="search-filter-row">
        {([['all', 'Semua'], ['kotoba', 'Kotoba'], ['bunpou', 'Bunpou']] as Array<[Filter, string]>).map(([key, label]) => (
          <button key={key} className={`search-filter-chip ${filter === key ? 'active' : ''}`} onClick={() => { setFilter(key); setOpenKey(null); }}>{label}</button>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="search-empty">{query ? `Tidak ada kartu yang cocok dengan “${query}”.` : 'Belum ada kartu yang dapat dicari.'}</div>
      ) : (
        <>
          <p className="search-result-count">{results.length} kartu ditemukan{results.length > shown.length ? ' (menampilkan 200 pertama)' : ''}.</p>
          <div className="search-results">
            {shown.map((item) => {
              const key = `${item.category}|${item.lessonNumber}|${item.cardId}`;
              const open = openKey === key;
              return (
                <div className="search-card" key={key}>
                  <button className="search-card-head" onClick={() => setOpenKey(open ? null : key)}>
                    <span className="search-card-word">{item.front}</span>
                    <span className="search-card-meta"><span className="search-card-loc">{item.category === 'kotoba' ? 'Kotoba' : 'Bunpou'} {item.lessonNumber}</span></span>
                    <span className="search-card-chev">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                  </button>
                  <div className={`search-card-detail${open ? ' open' : ''}`}>
                    <div className={`search-card-fields ${item.fields.length > 4 ? 'cols-6' : 'cols-4'}`}>
                      <Field label="Depan" value={item.front} />
                      {item.fields.map((field) => <Field key={field.label} label={field.label} value={field.value} />)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="search-field-col">
      <span className="search-field-label">{label}</span>
      <div className={`search-field-value${value ? '' : ' empty'}`}>{value || '(belum diisi)'}</div>
    </div>
  );
}
