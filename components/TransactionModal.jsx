'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { CURRENCIES, CUR_LABEL, today } from '@/lib/money';

export default function TransactionModal({ type, existing, categories, suggestions = {}, onClose, onSaved }) {
  const isPurchase = type === 'purchase';
  const isEdit = !!existing;
  const sg = { items: [], parties: [], descriptions: [], ...suggestions };
  const [f, setF] = useState({
    amount: existing ? String(existing.amount) : '',
    currency: existing ? existing.currency : (isPurchase ? 'IQD' : 'USD'),
    category_id: existing?.category_id || '',
    item: existing?.item || '',
    party: existing?.party || '',
    description: existing?.description || '',
    occurred_on: existing?.occurred_on || today(),
  });
  const [images, setImages] = useState(existing?.images ? existing.images.map((im) => ({ url: im.url })) : []);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true); setErr(null);
    try {
      for (const file of files) {
        const { url } = await api.uploadImage(file);
        setImages((prev) => [...prev, { url }]);
      }
    } catch (ex) {
      setErr(ex.message || 'تعذّر رفع الصورة');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async () => {
    if (busy) return;
    if (!(Number(f.amount) > 0)) { setErr('أدخل مبلغاً صحيحاً'); return; }
    if (isPurchase && !f.item.trim()) { setErr('اسم الصنف مطلوب'); return; }
    setBusy(true); setErr(null);
    const payload = {
      type,
      amount: Number(f.amount),
      currency: f.currency,
      category_id: isPurchase ? (f.category_id || null) : null,
      item: isPurchase ? f.item.trim() : null,
      party: f.party.trim(),
      description: f.description.trim(),
      occurred_on: f.occurred_on,
      images: images.map((i) => i.url),
    };
    try {
      if (isEdit) await api.updateTransaction(existing.id, payload);
      else await api.addTransaction(payload);
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
          <h3>{isEdit ? (isPurchase ? 'تعديل مشترى' : 'تعديل تبرع') : (isPurchase ? 'إضافة مشترى' : 'إضافة تبرع')}</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal2-body">
          {err ? <div className="form-msg err">{err}</div> : null}
          {isPurchase ? (
            <div className="form-field">
              <label>اسم الصنف / المادة <span style={{ color: 'var(--mawkab-red)' }}>*</span></label>
              <input value={f.item} onChange={(e) => set('item', e.target.value)} placeholder="مثال: أرز، غاز، أكياس" autoFocus list="dl-items" autoComplete="off" />
              <datalist id="dl-items">{sg.items.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
          ) : null}
          <div className="form-row">
            <div className="form-field">
              <label>المبلغ</label>
              <input type="number" inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value)} dir="ltr" autoFocus={!isPurchase} />
            </div>
            <div className="form-field" style={{ maxWidth: 170 }}>
              <label>العملة</label>
              <select value={f.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{CUR_LABEL[c]}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>{isPurchase ? 'المورّد / الجهة (اختياري)' : 'المتبرّع (اختياري)'}</label>
              <input value={f.party} onChange={(e) => set('party', e.target.value)} list="dl-parties" autoComplete="off" />
              <datalist id="dl-parties">{sg.parties.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
            <div className="form-field" style={{ maxWidth: 170 }}>
              <label>التاريخ</label>
              <input type="date" value={f.occurred_on} onChange={(e) => set('occurred_on', e.target.value)} dir="ltr" />
            </div>
          </div>

          {isPurchase ? (
            <div className="form-field">
              <label>الفئة</label>
              <select value={f.category_id} onChange={(e) => set('category_id', e.target.value)}>
                <option value="">— بدون فئة —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : null}

          <div className="form-field">
            <label>ملاحظة / بيان (اختياري)</label>
            <input value={f.description} onChange={(e) => set('description', e.target.value)} list="dl-desc" autoComplete="off" />
            <datalist id="dl-desc">{sg.descriptions.map((v) => <option key={v} value={v} />)}</datalist>
          </div>

          {isPurchase ? (
            <div className="form-field">
              <label>صور الفواتير (اختياري — يمكن إضافة أكثر من صورة)</label>
              <input type="file" accept="image/*" multiple onChange={onFiles} />
              {uploading ? <div className="acc-inline-msg">جارٍ الرفع…</div> : null}
              {images.length ? (
                <div className="inv-thumbs" style={{ marginTop: 8 }}>
                  {images.map((im, i) => (
                    <span key={i} className="inv-thumb-wrap">
                      <img src={im.url} alt="فاتورة" />
                      <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}>×</button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="admin-actions" style={{ marginTop: 8 }}>
            <button className="btn-add" onClick={submit} disabled={busy || uploading}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}
