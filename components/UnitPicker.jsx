'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

// Flexible unit selector: pick a unit, add a new one, or remove one — inline.
export default function UnitPicker({ value, onChange, units, setUnits, onChanged }) {
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const add = async () => {
    const v = adding.trim();
    if (!v || busy) return;
    setBusy(true); setErr(null);
    try {
      const { unit } = await api.addFridgeUnit(v);
      setAdding('');
      setUnits((prev) => (prev.some((u) => u.id === unit.id) ? prev : [...prev, unit].sort((a, b) => a.name.localeCompare(b.name, 'ar'))));
      onChange(unit.name); // select the freshly added unit
      onChanged && onChanged();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (u, e) => {
    e.stopPropagation();
    if (!window.confirm('حذف وحدة «' + u.name + '»؟')) return;
    setErr(null);
    try {
      await api.removeFridgeUnit(u.id);
      setUnits((prev) => prev.filter((x) => x.id !== u.id));
      if (value === u.name) onChange('');
      onChanged && onChanged();
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <div className="unit-picker">
      {err ? <div className="acc-inline-msg" style={{ color: 'var(--mawkab-red)' }}>{err}</div> : null}
      <div className="unit-chips">
        {units.length === 0 ? (
          <span style={{ color: 'var(--mawkab-muted)', fontSize: 13 }}>لا توجد وحدات — أضف واحدة بالأسفل</span>
        ) : null}
        {units.map((u) => (
          <button
            type="button"
            key={u.id}
            className={'unit-chip' + (value === u.name ? ' sel' : '')}
            onClick={() => onChange(value === u.name ? '' : u.name)}
          >
            {u.name}
            <span className="uc-x" onClick={(e) => remove(u, e)} title="حذف الوحدة">×</span>
          </button>
        ))}
      </div>
      <div className="unit-add">
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="أضف وحدة جديدة (مثال: كيلو، قطعة، كرتون)"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" className="btn-small" onClick={add} disabled={busy}>＋ إضافة</button>
      </div>
    </div>
  );
}
