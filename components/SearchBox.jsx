'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { normalizeText } from '@/lib/normalize';

// Wrap query matches inside `text` in <mark> for the dropdown display.
function markMatches(text, query, cls) {
  const nt = normalizeText(text);
  const nq = normalizeText(query);
  if (!nq) return text;
  const out = [];
  let from = 0;
  let i = nt.indexOf(nq);
  let k = 0;
  while (i !== -1) {
    if (i > from) out.push(text.slice(from, i));
    out.push(<mark key={k++} className={cls}>{text.slice(i, i + nq.length)}</mark>);
    from = i + nq.length;
    i = nt.indexOf(nq, from);
  }
  out.push(text.slice(from));
  return out;
}

export default function SearchBox({ basePath = '/c', scope = 'public', placeholder = 'ابحث في اللجان والمحتوى…' }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { results } = await api.search(term, scope);
        setResults(results);
        setOpen(true);
        setActive(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [q, scope]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const go = (r) => {
    setOpen(false);
    router.push(`${basePath}/${encodeURIComponent(r.slug)}?q=${encodeURIComponent(q.trim())}`);
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) {
      if (e.key === 'Enter' && results.length) go(results[0]);
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active >= 0 ? active : 0]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  const term = q.trim();

  return (
    <div className="search-box" ref={boxRef}>
      <div className="search-inputwrap">
        <svg className="search-ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder={placeholder}
          aria-label="بحث"
        />
        {q ? <button className="search-clear" onClick={() => { setQ(''); setResults([]); setOpen(false); }} aria-label="مسح">×</button> : null}
      </div>

      {open ? (
        <div className="search-results">
          {loading && !results.length ? (
            <div className="search-empty">جارٍ البحث…</div>
          ) : results.length === 0 ? (
            <div className="search-empty">لا نتائج لـ «{term}»</div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.slug}
                className={'search-result' + (i === active ? ' active' : '')}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
              >
                <div className="sr-name">
                  {markMatches(r.name, term, 'sb-hit')}
                  {r.nameMatch ? <span className="sr-tag">في اسم اللجنة</span> : null}
                </div>
                <div className="sr-snippet">{markMatches(r.snippet, term, 'sb-hit')}</div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
