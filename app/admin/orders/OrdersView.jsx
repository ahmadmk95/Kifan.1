'use client';

import { useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import OrderModal from '@/components/OrderModal';
import { api } from '@/lib/api';
import { fmtQty } from '@/lib/qty';
import { fmtDateTime } from '@/lib/money';

const STATUS = {
  pending: { label: 'بانتظار التجهيز', cls: 'st-pending' },
  prepared: { label: 'تم التجهيز', cls: 'st-prepared' },
  cancelled: { label: 'ملغى', cls: 'st-cancelled' },
};

export default function OrdersView({ readOnly = false }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);

  const load = () => api.orders().then(setData).catch(() => setErr('تعذّر تحميل البيانات'));
  useEffect(() => { load(); }, []);

  const orders = data?.orders || [];
  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const act = async (o, status) => {
    if (status === 'cancelled' && !window.confirm('إلغاء هذا الطلب؟')) return;
    setBusyId(o.id);
    try { await api.updateOrder(o.id, { status }); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  };

  const shareOrder = (o) => {
    const st = STATUS[o.status]?.label || '';
    const lines = o.lines.map((l) => `• ${l.item_name} × ${fmtQty(l.quantity)}${l.unit ? ' ' + l.unit : ''}`);
    const parts = [
      '📋 *طلب من الثلاجة*',
      'موكب أمير المؤمنين (ع)',
      `مقدّم الطلب: ${o.requester || '—'}`,
      `التاريخ: ${fmtDateTime(o.created_at)}`,
      `الحالة: ${st}`,
      '',
      'الأصناف المطلوبة:',
      ...lines,
    ];
    if (o.note) parts.push('', `ملاحظة: ${o.note}`);
    if (o.status === 'prepared' && o.prepared_by) parts.push('', `✔ جُهّز بواسطة ${o.prepared_by}`);
    window.open('https://wa.me/?text=' + encodeURIComponent(parts.join('\n')), '_blank');
  };

  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>الطلبات</h1>
          <div className="admin-actions">
            {!readOnly ? <button className="btn-add" onClick={() => setCreating(true)}>＋ طلب جديد</button> : null}
          </div>
        </div>

        {err ? (
          <div className="form-msg err">{err}</div>
        ) : !data ? (
          <p style={{ color: 'var(--mawkab-muted)' }}>جارٍ التحميل…</p>
        ) : (
          <>
            <div className="acc-toolbar">
              <div className="filter-tabs">
                {[['pending', `بانتظار التجهيز${pendingCount ? ` (${pendingCount})` : ''}`], ['prepared', 'تم التجهيز'], ['cancelled', 'ملغاة'], ['all', 'الكل']].map(([k, l]) => (
                  <button key={k} className={'ft' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>{l}</button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <img src="/logo.png" alt="الشعار" />
                <p>لا توجد طلبات</p>
                {!readOnly ? <button className="btn-add" onClick={() => setCreating(true)}>＋ طلب جديد</button> : null}
              </div>
            ) : (
              <div className="order-list">
                {filtered.map((o) => {
                  const st = STATUS[o.status] || STATUS.pending;
                  return (
                    <div className="order-card" key={o.id}>
                      <div className="order-top">
                        <span className={'order-status ' + st.cls}>{st.label}</span>
                        <div className="order-meta">
                          <span className="order-by">{o.requester || '—'}</span>
                          <span className="order-date" dir="ltr">{fmtDateTime(o.created_at)}</span>
                        </div>
                      </div>
                      {o.note ? <div className="order-note">📝 {o.note}</div> : null}
                      <div className="order-lines">
                        {o.lines.map((l) => (
                          <span className="order-line" key={l.id}>
                            {l.item_name} <b>× {fmtQty(l.quantity)}{l.unit ? ' ' + l.unit : ''}</b>
                          </span>
                        ))}
                      </div>
                      {o.status === 'prepared' && o.prepared_by ? (
                        <div className="order-prepared">✔ جُهّز بواسطة {o.prepared_by}{o.prepared_at ? ' — ' + fmtDateTime(o.prepared_at) : ''}</div>
                      ) : null}
                      <div className="admin-actions" style={{ marginTop: 4 }}>
                        <button className="wa-share wa-compact" onClick={() => shareOrder(o)}>
                          <svg viewBox="0 0 32 32" width="17" height="17" aria-hidden="true">
                            <path fill="currentColor" d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.6c1.7.9 3.7 1.4 5.8 1.4h.1c6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.9h-.1c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7.7.7-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.3 0-5.5 4.5-9.9 10-9.9 2.7 0 5.2 1 7 2.9 1.9 1.9 2.9 4.4 2.9 7 0 5.5-4.5 9.9-9.9 9.9zm5.5-7.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.2-.6-.4z"/>
                          </svg>
                          مشاركة عبر واتساب
                        </button>
                        {!readOnly && o.status === 'pending' ? (
                          <>
                            <button className="btn-add btn-out" disabled={busyId === o.id} onClick={() => act(o, 'prepared')}>✔ تم التجهيز</button>
                            <button className="btn-danger" disabled={busyId === o.id} onClick={() => act(o, 'cancelled')}>إلغاء الطلب</button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />

      {creating && data ? (
        <OrderModal
          items={data.items}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
        />
      ) : null}
    </div>
  );
}
