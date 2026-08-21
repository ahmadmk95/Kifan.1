'use client';

import { useMemo, useState } from 'react';
import Sheet from './Sheet';
import { api } from '@/lib/api';
import { fmtQty } from '@/lib/qty';

// Place an order by choosing quantities against الثلاجة items.
export default function OrderModal({ items = [], onClose, onSaved }) {
  const [qty, setQty] = useState({}); // item_id -> quantity string
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((it) => it.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const chosen = Object.entries(qty).filter(([, v]) => Number(v) > 0).length;

  const submit = async () => {
    if (busy) return;
    const lines = Object.entries(qty)
      .map(([item_id, v]) => ({ item_id, quantity: Number(v) }))
      .filter((l) => l.quantity > 0);
    if (lines.length === 0) { setErr('اختر صنفاً واحداً على الأقل'); return; }
    // Reject before sending if any requested quantity exceeds what's available.
    const overs = lines
      .map((l) => ({ ...l, item: items.find((i) => i.id === l.item_id) }))
      .filter((l) => l.item && l.quantity > Number(l.item.quantity));
    if (overs.length) {
      setErr('الكمية المطلوبة أكبر من المتوفّر: ' + overs.map((o) => o.item.name).join('، '));
      return;
    }
    setBusy(true); setErr(null);
    try {
      await api.addOrder({ note: note.trim() || null, lines });
      onSaved();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose}>
        <div className="modal2-head">
          <h3>طلب من الثلاجة</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal2-body">
          {err ? <div className="form-msg err">{err}</div> : null}

          <div className="form-field">
            <label>ملاحظة / لمن الطلب (اختياري)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: مطبخ الموكب، وجبة العشاء" />
          </div>

          <div className="form-field">
            <label>الأصناف — أدخل الكمية المطلوبة</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔎 ابحث عن صنف…" />
          </div>

          {items.length === 0 ? (
            <p style={{ color: 'var(--mawkab-muted)' }}>لا توجد أصناف في الثلاجة.</p>
          ) : (
            <div className="order-picklist">
              {shown.map((it) => {
                const over = Number(qty[it.id] || 0) > Number(it.quantity);
                return (
                  <div className="order-pick" key={it.id}>
                    <div className="op-info">
                      <span className="op-name">{it.name}</span>
                      <span className={'op-avail' + (over ? ' op-over-txt' : '')}>
                        المتوفّر: {fmtQty(it.quantity)}{it.unit ? ' ' + it.unit : ''}{over ? ' — أكبر من المتوفّر' : ''}
                      </span>
                    </div>
                    <div className="op-qty">
                      <input
                        type="number"
                        inputMode="decimal"
                        dir="ltr"
                        max={it.quantity}
                        placeholder="0"
                        className={over ? 'op-over' : ''}
                        value={qty[it.id] || ''}
                        onChange={(e) => setQty((s) => ({ ...s, [it.id]: e.target.value }))}
                      />
                      {it.unit ? <span className="op-unit">{it.unit}</span> : null}
                    </div>
                  </div>
                );
              })}
              {shown.length === 0 ? <p style={{ color: 'var(--mawkab-muted)', margin: '6px 2px' }}>لا نتائج.</p> : null}
            </div>
          )}

          <div className="admin-actions" style={{ marginTop: 8 }}>
            <button className="btn-add" onClick={submit} disabled={busy}>{busy ? 'جارٍ الإرسال…' : `إرسال الطلب${chosen ? ` (${chosen})` : ''}`}</button>
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </Sheet>
  );
}
