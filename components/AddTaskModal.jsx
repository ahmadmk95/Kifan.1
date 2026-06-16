'use client';

import { useState } from 'react';

export default function AddTaskModal({ committees, servants, nightId, onClose, onAdd }) {
  const [f, setF] = useState({
    title: '',
    committee: committees[0] ? committees[0].id : '',
    assignee: '',
    time: '',
    place: '',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const inComm = servants.filter((s) => s.committee_id === f.committee);
  const valid = f.title.trim() && f.time.trim() && f.place.trim() && f.assignee;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onAdd({ night: nightId, committee: f.committee, assignee: f.assignee, title: f.title, time: f.time, place: f.place, note: f.note });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>إضافة مهمة يومية</h3>
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>عنوان المهمة</label>
            <input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="مثال: تجهيز قسم الاستقبال" autoFocus />
          </div>
          <div className="field-row">
            <div className="field">
              <label>اللجنة</label>
              <select
                value={f.committee}
                onChange={(e) => {
                  set('committee', e.target.value);
                  set('assignee', '');
                }}
              >
                {committees.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>الخادمة</label>
              <select value={f.assignee} onChange={(e) => set('assignee', e.target.value)}>
                <option value="">اختاري…</option>
                {inComm.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!inComm.length ? (
            <div style={{ fontSize: 12.5, color: 'var(--crimson)', marginTop: -6, marginBottom: 12 }}>
              لا خادمات في هذه اللجنة بعد — فعّلي حساباً وأسنديه إليها
            </div>
          ) : null}
          <div className="field-row">
            <div className="field">
              <label>الوقت</label>
              <input value={f.time} onChange={(e) => set('time', e.target.value)} placeholder="٧:٠٠ م" />
            </div>
            <div className="field">
              <label>المكان</label>
              <input value={f.place} onChange={(e) => set('place', e.target.value)} placeholder="الصالة" />
            </div>
          </div>
          <div className="field">
            <label>ملاحظة (اختياري)</label>
            <input value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="تفاصيل إضافية…" />
          </div>
          <div className="modal-foot">
            <button className="btn-primary" disabled={!valid || busy} style={{ opacity: valid ? 1 : 0.45 }} onClick={submit}>
              إضافة المهمة
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
