'use client';

import { useState } from 'react';
import { Avatar } from './Shared';

export default function RequestCard({ user, committees, onActivate, onReject }) {
  const [comm, setComm] = useState('');
  const [busy, setBusy] = useState(false);

  const activate = async () => {
    if (!comm || busy) return;
    setBusy(true);
    try {
      await onActivate(user.id, comm);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!window.confirm('رفض طلب ' + user.name + '؟')) return;
    setBusy(true);
    try {
      await onReject(user.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="req-card">
      <Avatar member={user} className="av" />
      <div className="req-info">
        <div className="nm">{user.name}</div>
        <div className="un" style={{ direction: 'ltr', textAlign: 'right' }}>
          @{user.username}
        </div>
      </div>
      <span className="status-pill pending" style={{ marginInlineStart: 8 }}>
        بانتظار التفعيل
      </span>
      <div className="req-acts">
        <select value={comm} onChange={(e) => setComm(e.target.value)}>
          <option value="">اختاري اللجنة…</option>
          {committees.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn-ok" disabled={!comm || busy} onClick={activate}>
          تفعيل وإسناد
        </button>
        <button className="btn-reject" disabled={busy} onClick={reject}>
          رفض
        </button>
      </div>
    </div>
  );
}
