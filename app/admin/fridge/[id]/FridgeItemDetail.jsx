'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import FridgeItemModal from '@/components/FridgeItemModal';
import { api } from '@/lib/api';
import { fmtQty } from '@/lib/qty';

export default function FridgeItemDetail({ item: initial, readOnly = false }) {
  const router = useRouter();
  const [item, setItem] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const reload = async () => {
    const { item: fresh } = await api.fridgeItem(item.id);
    setItem(fresh);
  };

  const move = async (direction) => {
    if (busy) return;
    const n = Number(amount);
    if (!(n > 0)) { setMsg({ t: 'err', x: 'أدخل كمية صحيحة' }); return; }
    setBusy(true); setMsg(null);
    try {
      await api.addFridgeMovement(item.id, { direction, amount: n, reason: reason.trim() || null });
      setAmount(''); setReason('');
      await reload();
      setMsg({ t: 'ok', x: direction === 'in' ? 'تم الإدخال' : 'تم الإخراج' });
    } catch (e) {
      setMsg({ t: 'err', x: e.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`حذف الصنف «${item.name}» وكل حركاته؟`)) return;
    await api.removeFridgeItem(item.id);
    router.push('/admin/fridge');
    router.refresh();
  };

  const low = item.min_qty != null && Number(item.quantity) <= Number(item.min_qty);
  const out = Number(item.quantity) <= 0;

  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>{item.name}</h1>
          <div className="admin-actions">
            <Link href="/admin/fridge" className="btn-ghost">← رجوع للثلاجة</Link>
            {!readOnly ? (
              <>
                <button className="btn-small" onClick={() => setEditing(true)}>تعديل</button>
                <button className="btn-danger" onClick={remove}>حذف</button>
              </>
            ) : null}
          </div>
        </div>

        {msg ? <div className={'form-msg ' + msg.t}>{msg.x}</div> : null}

        <div className="fridge-detail">
          <div className={'fd-hero' + (out ? ' is-out' : low ? ' is-low' : '')}>
            {item.image_url ? (
              <span className="fd-img" style={{ backgroundImage: `url(${item.image_url})` }} />
            ) : (
              <span className="fd-img fd-img-ph">🧺</span>
            )}
            <div className="fd-qtybox">
              <div className="fd-qty">{fmtQty(item.quantity)}<span className="fd-unit">{item.unit ? ' ' + item.unit : ''}</span></div>
              <div className="fd-qty-label">الكمية المتوفّرة{low ? (out ? ' — نفد المخزون' : ' — منخفض') : ''}</div>
              {item.min_qty != null ? <div className="fd-min">حد التنبيه: {fmtQty(item.min_qty)}{item.unit ? ' ' + item.unit : ''}</div> : null}
            </div>
          </div>

          {item.note ? <div className="fd-note">📝 {item.note}</div> : null}

          {!readOnly ? (
            <div className="acc-panel fd-move">
              <h2 className="acc-h">تسجيل حركة</h2>
              <div className="form-row">
                <div className="form-field" style={{ maxWidth: 180 }}>
                  <label>الكمية</label>
                  <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" dir="ltr" />
                </div>
                <div className="form-field">
                  <label>سبب / ملاحظة (اختياري)</label>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: استلام من المورّد، صرف للمطبخ" />
                </div>
              </div>
              <div className="admin-actions">
                <button className="btn-add btn-out" onClick={() => move('in')} disabled={busy}>＋ إدخال</button>
                <button className="btn-add" onClick={() => move('out')} disabled={busy}>－ إخراج</button>
              </div>
            </div>
          ) : null}

          <h2 className="acc-h" style={{ marginTop: 24 }}>سجل الحركات</h2>
          {item.movements.length === 0 ? (
            <p style={{ color: 'var(--mawkab-muted)' }}>لا توجد حركات بعد.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table acc-table">
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>التاريخ</th>
                    <th style={{ width: 110 }}>الحركة</th>
                    <th style={{ width: 110 }}>الرصيد</th>
                    <th>السبب</th>
                    <th style={{ width: 130 }}>بواسطة</th>
                  </tr>
                </thead>
                <tbody>
                  {item.movements.map((m) => (
                    <tr key={m.id}>
                      <td data-label="التاريخ" style={{ direction: 'ltr', textAlign: 'right' }}>{(m.created_at || '').slice(0, 16)}</td>
                      <td data-label="الحركة">
                        <span className={'tx-pill ' + (m.delta >= 0 ? 'tx-in' : 'tx-out')}>
                          {m.delta >= 0 ? '＋' : '－'}{fmtQty(Math.abs(m.delta))}{item.unit ? ' ' + item.unit : ''}
                        </span>
                      </td>
                      <td data-label="الرصيد" style={{ fontWeight: 700 }}>{fmtQty(m.balance)}</td>
                      <td data-label="السبب">{m.reason || '—'}</td>
                      <td data-label="بواسطة">{m.user_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />

      {editing ? (
        <FridgeItemModal
          existing={item}
          onClose={() => setEditing(false)}
          onSaved={async () => { setEditing(false); await reload(); }}
        />
      ) : null}
    </div>
  );
}
