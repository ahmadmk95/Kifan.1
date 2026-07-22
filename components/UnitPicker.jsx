'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

// Unit selector: a dropdown to choose from the managed units, with a quick
// inline "add new unit" (persists to the list). Removal is done in the
// الوحدات manager on the fridge dashboard.
export default function UnitPicker({ value, onChange, units, setUnits, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const add = async () => {
    const v = name.trim();
    if (!v || busy) return;
    setBusy(true); setErr(null);
    try {
      const { unit } = await api.addFridgeUnit(v);
      setUnits((prev) =>
        prev.some((u) => u.id === unit.id) ? prev : [...prev, unit].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      );
      onChange(unit.name);
      setName(''); setAdding(false);
      onChanged && onChanged();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const inList = units.some((u) => u.name === value);

  return (
    <div className="unit-picker">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— اختر الوحدة —</option>
        {units.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
        {value && !inList ? <option value={value}>{value}</option> : null}
      </select>

      {!adding ? (
        <button type="button" className="unit-add-link" onClick={() => setAdding(true)}>＋ إضافة وحدة جديدة</button>
      ) : (
        <div className="unit-add">
          <input
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم الوحدة الجديدة"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          />
          <button type="button" className="btn-small" onClick={add} disabled={busy}>حفظ</button>
          <button type="button" className="btn-ghost" onClick={() => { setAdding(false); setName(''); setErr(null); }}>إلغاء</button>
        </div>
      )}
      {err ? <div className="acc-inline-msg" style={{ color: 'var(--mawkab-red)' }}>{err}</div> : null}
    </div>
  );
}
