'use client';

import { useState } from 'react';
import Sheet from './Sheet';
import { api } from '@/lib/api';

const BLANK = { name: '', qty: '', unit: '', whole: false };

// Create or edit a dish: its ingredients at one reference batch, with one of
// them marked as الثابت — the ingredient everything else scales from.
export default function RecipeModal({ existing, onClose, onSaved }) {
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name || '');
  const [note, setNote] = useState(existing?.note || '');
  const [rows, setRows] = useState(() =>
    existing?.items?.length
      ? existing.items.map((i) => ({ name: i.name, qty: String(i.qty), unit: i.unit || '', whole: !!i.whole }))
      : [{ ...BLANK }, { ...BLANK }, { ...BLANK }]
  );
  const [baseIndex, setBaseIndex] = useState(() => {
    const i = existing?.items?.findIndex((x) => x.is_base);
    return i != null && i >= 0 ? i : 0;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const setRow = (i, k, v) => setRows((s) => s.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((s) => [...s, { ...BLANK }]);
  const removeRow = (i) => setRows((s) => {
    const next = s.filter((_, j) => j !== i);
    if (baseIndex === i) setBaseIndex(0);
    else if (baseIndex > i) setBaseIndex(baseIndex - 1);
    return next.length ? next : [{ ...BLANK }];
  });

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) { setErr('اسم الطبخة مطلوب'); return; }
    const filled = rows.filter((r) => r.name.trim() && Number(r.qty) > 0);
    if (!filled.length) { setErr('أضف مكوّناً واحداً على الأقل بكمية صحيحة'); return; }
    if (!(Number(rows[baseIndex]?.qty) > 0) || !rows[baseIndex]?.name.trim()) {
      setErr('حدّد الثابت واملأ اسمه وكميته'); return;
    }
    setBusy(true); setErr(null);
    const payload = {
      name: name.trim(),
      note: note.trim() || null,
      baseIndex,
      items: rows.map((r) => ({ name: r.name.trim(), qty: Number(r.qty), unit: r.unit.trim() || null, whole: r.whole })),
    };
    try {
      if (isEdit) await api.updateRecipe(existing.id, payload);
      else await api.addRecipe(payload);
      onSaved();
    } catch (e) {
      setErr(e.message || 'تعذّر الحفظ');
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} maxWidth={760}>
      <div className="modal2-head">
        <h3>{isEdit ? 'تعديل الطبخة' : 'طبخة جديدة'}</h3>
        <button className="x" onClick={onClose}>×</button>
      </div>
      <div className="modal2-body">
        {err ? <div className="form-msg err">{err}</div> : null}

        <div className="form-field">
          <label>اسم الطبخة <span style={{ color: 'var(--mawkab-red)' }}>*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: قيمة، برياني، مرق" autoFocus />
        </div>

        <div className="form-field">
          <label>ملاحظة (اختياري)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="أي تفاصيل عن الطبخة" />
        </div>

        <div className="form-field">
          <label>المكوّنات بالكميات الأساسية</label>
          <p className="acc-note" style={{ margin: '0 0 10px' }}>
            اختر «الثابت» — وهو المكوّن الذي تُحسب عليه بقية المكوّنات (العيش مثلاً).
            وعلّم «وحدات كاملة» لما لا يتجزّأ مثل الذبيحة والعلبة والكيس ليُقرَّب للأعلى.
          </p>
          <div className="rc-rows">
            <div className="rc-row rc-head">
              <span>الثابت</span>
              <span>المكوّن</span>
              <span>الكمية</span>
              <span>الوحدة</span>
              <span>وحدات كاملة</span>
              <span />
            </div>
            {rows.map((r, i) => (
              <div className={'rc-row' + (baseIndex === i ? ' is-base' : '')} key={i}>
                <label className="rc-radio">
                  <input type="radio" name="baseIdx" checked={baseIndex === i} onChange={() => setBaseIndex(i)} />
                </label>
                <input value={r.name} onChange={(e) => setRow(i, 'name', e.target.value)} placeholder="اسم المكوّن" />
                <input type="number" inputMode="decimal" dir="ltr" value={r.qty}
                  onChange={(e) => setRow(i, 'qty', e.target.value)} placeholder="0" />
                <input value={r.unit} onChange={(e) => setRow(i, 'unit', e.target.value)} placeholder="كيلو" />
                <label className="rc-check">
                  <input type="checkbox" checked={r.whole} onChange={(e) => setRow(i, 'whole', e.target.checked)} />
                </label>
                <button type="button" className="rc-del" onClick={() => removeRow(i)} aria-label="حذف">×</button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-ghost btn-mini" onClick={addRow} style={{ marginTop: 10 }}>＋ مكوّن</button>
        </div>

        <div className="admin-actions" style={{ marginTop: 8 }}>
          <button className="btn-add" onClick={submit} disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </Sheet>
  );
}
