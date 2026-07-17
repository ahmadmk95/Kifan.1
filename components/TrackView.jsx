'use client';

import { useEffect, useRef } from 'react';

// Fires a one-time view beacon after the page mounts. Pass `slug` for a
// committee page; omit it for a home/site visit.
export default function TrackView({ slug }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slug ? { slug } : {}),
      credentials: 'include',
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}
