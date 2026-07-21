'use client';

import { useState, useRef, useEffect } from 'react';

// A text input with a custom suggestion dropdown drawn from previous entries.
// Custom (not native <datalist>) because datalist is unreliable on iOS Safari.
export default function Autocomplete({
  value,
  onChange,
  options = [],
  placeholder,
  autoFocus = false,
  dir,
  type = 'text',
  inputMode,
  wrapStyle,
  onEnter,
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const wrapRef = useRef(null);

  const q = (value || '').trim().toLowerCase();
  const matches = [];
  const seen = new Set();
  for (const o of options) {
    const s = (o == null ? '' : String(o)).trim();
    if (!s) continue;
    const low = s.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    if (low === q) continue;            // don't suggest the exact current value
    if (q && !low.includes(q)) continue; // filter by the letters typed
    matches.push(s);
    if (matches.length >= 8) break;
  }

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, []);

  const choose = (val) => { onChange(val); setOpen(false); setHi(-1); };

  return (
    <div className="ac-wrap" ref={wrapRef} style={wrapStyle}>
      <input
        className="ac-input"
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        dir={dir}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (open && hi >= 0 && matches[hi]) { e.preventDefault(); choose(matches[hi]); return; }
            if (onEnter) { onEnter(); return; }
          }
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Escape') { setOpen(false); setHi(-1); }
        }}
      />
      {open && matches.length > 0 ? (
        <ul className="ac-list">
          {matches.map((m, i) => (
            <li
              key={m}
              className={'ac-item' + (i === hi ? ' hi' : '')}
              onMouseDown={(e) => { e.preventDefault(); choose(m); }}
            >
              {m}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
