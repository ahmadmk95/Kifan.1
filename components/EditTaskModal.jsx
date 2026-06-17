'use client';

import { useState } from 'react';

export default function EditTaskModal({ task, committees, servants, onClose, onSave }) {
  const [f, setF] = useState({
    title: task.title || '',
    committee_id: task.committee_id || '',
    assignee_id: task.assignee_id || '',
    time: task.time || '',
    place: task.place || '',
    note: task.note || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const inComm = servants.filter((s) => s.committee_id === f.committee_id);
  const valid = f.title.trim() && f.time.trim() && f.place.trim();

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onSave(task.id, {
        title: f.title.trim(),
        time: f.time.trim(),
        place: f.place.trim(),
        note: f.note.trim(),
        assignee_id: f.assignee_id || null,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>تعديل المهمة</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>عنوان المهمة</label>
            <input value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus />
          </div>
          <div className="field-row">
            <div className="field">
              <label>اللجنة</label>
              <select value={f.committee_id} onChange={(e) => { set('committee_id', e.target.value); set('assignee_id', ''); }}>
                {committees.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>الخادمة (اختياري)</label>
              <select value={f.assignee_id} onChange={(e) => set('assignee_id', e.target.value)}>
                <option value="">— بدون تحديد —</option>
                {inComm.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
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
              حفظ التعديلات
            </button>
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}
