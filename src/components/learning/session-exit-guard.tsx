'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

type HistoryNavigationEvent = Event & { navigationType: string; destination: { url: string; sameDocument: boolean } };

export function SessionExitGuard({ active, kind }: { active: boolean; kind: 'practice' | 'flashcard' }) {
  const router = useRouter();
  const [destination, setDestination] = useState<(() => void) | null>(null);
  const leaving = useRef(false);
  useEffect(() => {
    if (!active) return;
    leaving.current = false;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest('a[href]');
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      event.preventDefault();
      event.stopPropagation();
      setDestination(() => () => router.push(url.pathname + url.search + url.hash));
    };
    const submit = (event: SubmitEvent) => {
      const form = event.target;
      // Logout in the surrounding navigation is also an exit from the session.
      if (!(form instanceof HTMLFormElement) || !form.closest('aside') || leaving.current) return;
      event.preventDefault();
      event.stopPropagation();
      setDestination(() => () => form.requestSubmit());
    };
    // Same-document Back/Forward does not fire beforeunload in an App Router SPA.
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const traverse = (event: Event) => {
      const navigationEvent = event as HistoryNavigationEvent;
      if (leaving.current || navigationEvent.navigationType !== 'traverse' || !navigationEvent.destination.sameDocument || !event.cancelable) return;
      event.preventDefault();
      setDestination(() => () => location.assign(navigationEvent.destination.url));
    };
    navigation?.addEventListener('navigate', traverse);
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    document.addEventListener('submit', submit, true);
    return () => {
      navigation?.removeEventListener('navigate', traverse);
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', click, true);
      document.removeEventListener('submit', submit, true);
    };
  }, [active, router]);
  return <Modal isOpen={active && !!destination} onClose={() => setDestination(null)}
    title={kind === 'practice' ? 'Sesi belum selesai' : 'Sesi flashcard belum selesai'}>
    <div className="space-y-5">
      <p>{kind === 'practice' ? 'Jawaban yang sudah dikirim tetap tersimpan, tetapi hasil sesi belum dianggap selesai.' : 'Review yang sudah dilakukan tetap tersimpan, tetapi sesi ini belum selesai.'}</p>
      <p>Yakin ingin keluar?</p>
      <div className="flex flex-wrap gap-3">
        <Button autoFocus variant="secondary" onClick={() => setDestination(null)}>Tetap Belajar</Button>
        <Button onClick={() => { leaving.current = true; destination?.(); setDestination(null); }}>Keluar</Button>
      </div>
    </div>
  </Modal>;
}
