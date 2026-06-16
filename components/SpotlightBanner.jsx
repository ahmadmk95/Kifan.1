'use client';

import { useEffect, useState } from 'react';
import { toAr } from '@/lib/palette';
import { api } from '@/lib/api';

export default function SpotlightBanner() {
  const [spot, setSpot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cheered, setCheered] = useState(false);

  useEffect(() => {
    api
      .spotlight()
      .then(({ spotlight }) => setSpot(spotlight))
      .catch(() => {});
  }, []);

  if (!spot) return null;

  const cheer = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { cheer_count } = await api.encourageSpotlight();
      setSpot((s) => (s ? { ...s, cheer_count } : s));
      setCheered(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="spotlight-banner">
      <span className="sp-ic">🌟</span>
      <div className="sp-body">
        <div className="sp-title">
          خادمة اليوم: <strong>{spot.member_name}</strong>
        </div>
        {spot.note ? <div className="sp-note">{spot.note}</div> : null}
      </div>
      <button className="sp-cheer" onClick={cheer} disabled={busy || cheered}>
        🤍 شدّي على يدها <span className="ar-num">{toAr(spot.cheer_count)}</span>
      </button>
    </div>
  );
}
