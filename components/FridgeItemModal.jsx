'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

const UNIT_SUGGESTIONS = ['كيلو', 'غرام', 'قطعة', 'حبة', 'علبة', 'كيس', 'كرتون', 'صندوق', 'لتر', 'عبوة'];

export default function FridgeItemModal({ existing, onClose, onSaved }) {
  const isEdit = !!existing;
  const [f, setF] = useState({
    name: existing?.name || '',
    unit: existing?.unit || '',
    quantity: '',
    min_qty: existing?.min_qty != null ? String(existing.min_qty) : '',
    note: existing?.note || '',
  });
  const [imageUrl, setImageUrl] = useState(existing?.image_url || '');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const onFile = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setUploading(true); setErr(null);
    try {
      const { url } = await api.uploadImage(file);
      setImageUrl(url);
    } catch (ex) {
      setErr(ex.message || 'تعذّر رفع الصورة');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async () => {
    if (busy) return;
    if (!f.name.trim()) { setErr('اسم الصنف مطلوب'); return; }
    setBusy(true); setErr(null);
    const payload = {
      name: f.name.trim(),
      unit: f.unit.trim() || null,
      min_qty: f.min_qty === '' ? null : Number(f.min_qty),
      note: f.note.trim() || null,
      image_url: imageUrl || null,
    };
    if (!isEdit) payload.quantity = f.quantity === '' ? 0 : Number(f.quantity);
    try {
      if (isEdit) await api.updateFridgeItem(existing.id, payload);
      else await api.addFridgeItem(payload);
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal2" onClick={(e) => e.stopPropagation()}>
        <div className="modal2-head">
          <h3>{isEdit ? 'تعديل الصنف' : 'إضافة صنف للثلاجة'}</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal2-body">
          {err ? <div className="form-msg err">{err}</div> : null}

          <div className="form-field">
            <label>اسم الصنف <span style={{ color: 'var(--mawkab-red)' }}>*</span></label>
            <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="مثال: دجاج، أرز، طماطة" autoFocus />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>وحدة القياس</label>
              <input value={f.unit} onChange={(e) => set('unit', e.target.value)} placeholder="مثال: كيلو، قطعة، كرتون" list="dl-units" autoComplete="off" />
              <datalist id="dl-units">{UNIT_SUGGESTIONS.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
            {!isEdit ? (
              <div className="form-field" style={{ maxWidth: 160 }}>
                <label>الكمية الحالية</label>
                <input type="number" inputMode="decimal" value={f.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0" dir="ltr" />
              </div>
            ) : null}
          </div>

          <div className="form-field">
            <label>حد التنبيه (تنبيه عند النقص)</label>
            <input type="number" inputMode="decimal" value={f.min_qty} onChange={(e) => set('min_qty', e.target.value)} placeholder="اتركه فارغاً لعدم التنبيه" dir="ltr" />
          </div>

          <div className="form-field">
            <label>ملاحظة (اختياري)</label>
            <input value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="مثال: مكان التخزين، الماركة…" />
          </div>

          <div className="form-field">
            <label>صورة الصنف (اختياري)</label>
            <input type="file" accept="image/*" onChange={onFile} />
            {uploading ? <div className="acc-inline-msg">جارٍ الرفع…</div> : null}
            {imageUrl ? (
              <div className="inv-thumbs" style={{ marginTop: 8 }}>
                <span className="inv-thumb-wrap">
                  <img src={imageUrl} alt="صورة الصنف" />
                  <button type="button" onClick={() => setImageUrl('')}>×</button>
                </span>
              </div>
            ) : null}
          </div>

          <div className="admin-actions" style={{ marginTop: 8 }}>
            <button className="btn-add" onClick={submit} disabled={busy || uploading}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}
