'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { planApi } from '@/lib/plan/client';
import HistorySheet from './HistorySheet';

// Shared plumbing for every /plan page: who is viewing (editor or not), a
// toast, the per-record History sheet, and live refresh — when anyone saves a
// change, every open page (master and branches) re-renders with the new data.
const Ctx = createContext(null);
export const usePlan = () => useContext(Ctx);

export default function PlanShell({ user, children }) {
  const router = useRouter();
  const [toast, setToast] = useState(null);
  const [history, setHistory] = useState(null); // { entity, id, label }
  const version = useRef(null);
  const timer = useRef(null);

  const notify = useCallback((text, kind = 'ok') => {
    setToast({ text, kind, at: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), kind === 'err' ? 6000 : 2600);
  }, []);

  const refresh = useCallback(() => router.refresh(), [router]);

  // Poll the data version; refresh the page when it changes.
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { v } = await planApi.version();
        if (version.current !== null && v !== version.current) router.refresh();
        version.current = v;
      } catch {
        // offline for a moment — try again next tick
      }
    };
    tick();
    const id = setInterval(() => { if (!stop) tick(); }, 8000);
    const onVis = () => tick();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop = true; clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [router]);

  const value = {
    user,
    canEdit: !!user?.canEdit,
    isAdmin: !!user?.isAdmin,
    notify,
    refresh,
    openHistory: (entity, id, label) => setHistory({ entity, id, label }),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {history ? <HistorySheet {...history} onClose={() => setHistory(null)} /> : null}
      {toast ? (
        <div className={'pl-toast ' + toast.kind} role="status" key={toast.at}>
          {toast.text}
        </div>
      ) : null}
    </Ctx.Provider>
  );
}
