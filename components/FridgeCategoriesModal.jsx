'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function FridgeCategoriesModal({ categories = [], onClose, onChanged }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const add = async () => {
    const v = name.trim();
    if (!v || busy) return;
    setBusy(true); setErr(null);
    try { await api.addFridgeCategory(v); setName(''); onChanged(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (c) => {
    if (!window.confirm('حذف فئة «' + c.name + '»؟')) return;
    try { await api.removeFridgeCategory(c.id); onChanged(); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal2" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal2-head">
          <h3>فئات الأصناف</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal2-body">
          {err ? <div className="form-msg err">{err}</div> : null}
          <div className="rate-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم الفئة (مثال: خضار، لحوم، ألبان)"
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
              style={{ flex: 1, maxWidth: 'none' }}
            />
            <button className="btn-add" onClick={add} disabled={busy}>＋</button>
          </div>
          <div className="cat-chips">
            {categories.length === 0 ? (
              <span style={{ color: 'var(--mawkab-muted)', fontSize: 13 }}>لا توجد فئات بعد</span>
            ) : null}
            {categories.map((c) => (
              <span key={c.id} className="cat-chip">
                {c.name}
                <button onClick={() => remove(c)}>×</button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
