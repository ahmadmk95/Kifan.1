'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function FridgeUnitsModal({ units = [], onClose, onChanged }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const add = async () => {
    const v = name.trim();
    if (!v || busy) return;
    setBusy(true); setErr(null);
    try { await api.addFridgeUnit(v); setName(''); onChanged(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (u) => {
    if (!window.confirm('حذف وحدة «' + u.name + '»؟')) return;
    try { await api.removeFridgeUnit(u.id); onChanged(); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal2" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal2-head">
          <h3>وحدات القياس</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal2-body">
          {err ? <div className="form-msg err">{err}</div> : null}
          <p className="acc-note" style={{ margin: 0 }}>الوحدات التي تظهر كخيارات عند إضافة صنف (مثال: كيلو، قطعة، كرتون).</p>
          <div className="rate-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم الوحدة (مثال: كيلو، قطعة، كرتون)"
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
              style={{ flex: 1, maxWidth: 'none' }}
            />
            <button className="btn-add" onClick={add} disabled={busy}>＋</button>
          </div>
          <div className="cat-chips">
            {units.length === 0 ? (
              <span style={{ color: 'var(--mawkab-muted)', fontSize: 13 }}>لا توجد وحدات بعد</span>
            ) : null}
            {units.map((u) => (
              <span key={u.id} className="cat-chip">
                {u.name}
                <button onClick={() => remove(u)}>×</button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
