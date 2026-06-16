'use client';

import { useState } from 'react';
import { COMMITTEE_PALETTE } from '@/lib/palette';

export default function AddCommitteeModal({ committees, onClose, onAdd }) {
  const used = committees.map((c) => c.color);
  const choices = COMMITTEE_PALETTE.filter((p) => !used.includes(p.color)).concat(COMMITTEE_PALETTE);
  const [name, setName] = useState('');
  const [pi, setPi] = useState(0);
  const [busy, setBusy] = useState(false);
  const pal = choices[pi] || COMMITTEE_PALETTE[0];
  const valid = name.trim();

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onAdd({ name: name.trim(), color: pal.color, soft: pal.soft });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>إضافة لجنة جديدة</h3>
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>اسم اللجنة</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: لجنة الأطفال" autoFocus />
          </div>
          <div className="field">
            <label>اللون المميّز</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {COMMITTEE_PALETTE.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPi(choices.indexOf(p) >= 0 ? choices.indexOf(p) : 0)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: p.color,
                    border: pal.color === p.color ? '3px solid var(--ink)' : '2px solid #fff',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn-primary" disabled={!valid || busy} style={{ opacity: valid ? 1 : 0.45 }} onClick={submit}>
              إضافة اللجنة
            </button>
            <button className="btn-ghost" onClick={onClose}>
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
