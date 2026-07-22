'use client';

import { useState, useRef, useEffect } from 'react';

// A custom select styled to match the Autocomplete field (same box + dropdown
// list), so pickers look consistent with the item-name field.
export default function Dropdown({ value, onChange, options = [], placeholder = '— اختر —' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, []);

  const selected = options.find((o) => o.value === value);
  const choose = (v) => { onChange(v); setOpen(false); };

  return (
    <div className="ac-wrap" ref={wrapRef}>
      <button type="button" className={'ac-input ac-select' + (open ? ' open' : '')} onClick={() => setOpen((o) => !o)}>
        <span className={selected ? '' : 'ac-ph'}>{selected ? selected.label : placeholder}</span>
        <span className="ac-caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <ul className="ac-list">
          {options.map((o) => (
            <li
              key={o.value}
              className={'ac-item' + (o.value === value ? ' hi' : '')}
              onMouseDown={(e) => { e.preventDefault(); choose(o.value); }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
