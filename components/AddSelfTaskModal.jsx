'use client';

import { useState } from 'react';

export default function AddSelfTaskModal({ onClose, onAdd }) {
  const [f, setF] = useState({ title: '', time: '', place: '', note: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.title.trim() && f.time.trim() && f.place.trim();

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onAdd({ title: f.title.trim(), time: f.time.trim(), place: f.place.trim(), note: f.note.trim() });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>إضافة مهمة لنفسي</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>عنوان المهمة</label>
            <input value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus placeholder="ماذا ستفعلين؟" />
          </div>
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
              إضافة
            </button>
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}
