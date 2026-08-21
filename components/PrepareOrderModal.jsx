'use client';

import { useState } from 'react';
import Sheet from './Sheet';
import { api } from '@/lib/api';
import { fmtQty } from '@/lib/qty';

// Confirm preparing an order, with an OPTIONAL photo the team can take/attach.
export default function PrepareOrderModal({ order, onClose, onDone }) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const onFile = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setUploading(true); setErr(null);
    try {
      const { url } = await api.uploadImage(file);
      setPhotoUrl(url);
    } catch (ex) {
      setErr(ex.message || 'تعذّر رفع الصورة');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const confirm = async () => {
    if (busy || uploading) return;
    setBusy(true); setErr(null);
    try {
      await api.updateOrder(order.id, { status: 'prepared', photo_url: photoUrl || null });
      onDone();
    } catch (ex) {
      setErr(ex.message || 'تعذّر الحفظ');
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose}>
        <div className="modal2-head">
          <h3>تجهيز الطلب</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal2-body">
          {err ? <div className="form-msg err">{err}</div> : null}

          <div className="order-lines" style={{ marginBottom: 4 }}>
            {order.lines.map((l) => (
              <span className="order-line" key={l.id}>
                {l.item_name} <b>× {fmtQty(l.quantity)}{l.unit ? ' ' + l.unit : ''}</b>
              </span>
            ))}
          </div>

          <div className="form-field">
            <label>صورة الطلب بعد التجهيز (اختياري)</label>
            <input type="file" accept="image/*" capture="environment" onChange={onFile} />
            {uploading ? <div className="acc-inline-msg">جارٍ الرفع…</div> : null}
            {photoUrl ? (
              <div className="inv-thumbs" style={{ marginTop: 8 }}>
                <span className="inv-thumb-wrap">
                  <img src={photoUrl} alt="صورة الطلب" />
                  <button type="button" onClick={() => setPhotoUrl('')}>×</button>
                </span>
              </div>
            ) : null}
          </div>

          <div className="admin-actions" style={{ marginTop: 8 }}>
            <button className="btn-add" onClick={confirm} disabled={busy || uploading}>
              {busy ? 'جارٍ الحفظ…' : '✔ تأكيد التجهيز'}
            </button>
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </Sheet>
  );
}
