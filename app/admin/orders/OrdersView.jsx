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
                      {!readOnly && o.status === 'pending' ? (
                        <div className="admin-actions" style={{ marginTop: 4 }}>
                          <button className="btn-add btn-out" disabled={busyId === o.id} onClick={() => act(o, 'prepared')}>✔ تم التجهيز</button>
                          <button className="btn-danger" disabled={busyId === o.id} onClick={() => act(o, 'cancelled')}>إلغاء الطلب</button>
                        </div>
                      ) : null}
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
