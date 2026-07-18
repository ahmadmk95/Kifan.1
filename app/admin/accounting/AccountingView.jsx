'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TransactionModal from '@/components/TransactionModal';
import { api } from '@/lib/api';
import { usd, amt } from '@/lib/money';

export default function AccountingView({ readOnly = false }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [modal, setModal] = useState(null); // { type, existing? } | null
  const [filter, setFilter] = useState('all');

  const load = () => api.accounting().then(setData).catch(() => setErr('تعذّر تحميل البيانات'));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.transactions;
    return data.transactions.filter((t) => t.type === filter);
  }, [data, filter]);

  if (err) return <Shell><div className="form-msg err">{err}</div></Shell>;
  if (!data) return <Shell><p style={{ color: 'var(--mawkab-muted)' }}>جارٍ التحميل…</p></Shell>;

  const t = data.totals;

  return (
    <Shell>
      <div className="admin-bar">
        <h1>المحاسبة</h1>
        <div className="admin-actions">
          <Link href="/admin/accounting/report" className="btn-ghost">تقرير PDF</Link>
          {!readOnly ? (
            <>
              <button className="btn-add" onClick={() => setModal({ type: 'donation' })}>＋ تبرع</button>
              <button className="btn-add btn-out" onClick={() => setModal({ type: 'purchase' })}>＋ مشترى</button>
            </>
          ) : null}
        </div>
      </div>

      {/* Summary */}
      <div className="stat-cards acc-cards">
        <div className="stat-card acc-in">
          <div className="sc-value">{usd(t.donations_usd)}</div>
          <div className="sc-label">إجمالي التبرعات</div>
        </div>
        <div className="stat-card acc-out">
          <div className="sc-value">{usd(t.purchases_usd)}</div>
          <div className="sc-label">إجمالي المشتريات</div>
        </div>
        <div className={'stat-card ' + (t.balance_usd >= 0 ? 'acc-bal' : 'acc-neg')}>
          <div className="sc-value">{usd(t.balance_usd)}</div>
          <div className="sc-label">الرصيد المتبقّي</div>
        </div>
      </div>

      <div className="acc-grid">
        <RatesPanel rates={data.rates} onSaved={load} readOnly={readOnly} />
        <CategoriesPanel categories={data.categories} onChanged={load} readOnly={readOnly} />
      </div>

      {data.by_category.length > 0 && (
        <div className="acc-panel">
          <h2 className="acc-h">المشتريات حسب الفئة</h2>
          <div className="cat-breakdown">
            {data.by_category.map((c) => (
              <div key={c.name} className="cbd-row">
                <span className="cbd-name">{c.name}</span>
                <span className="cbd-val">{usd(c.usd)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="acc-toolbar">
        <h2 className="acc-h" style={{ margin: 0 }}>الحركات</h2>
        <div className="filter-tabs">
          {[['all', 'الكل'], ['donation', 'تبرعات'], ['purchase', 'مشتريات']].map(([k, l]) => (
            <button key={k} className={'ft' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: 'var(--mawkab-muted)' }}>لا توجد حركات بعد.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table acc-table">
            <thead>
              <tr>
                <th style={{ width: 96 }}>التاريخ</th>
                <th style={{ width: 70 }}>النوع</th>
                <th>البيان</th>
                <th style={{ width: 120 }}>الفئة</th>
                <th style={{ width: 130 }}>المبلغ</th>
                <th style={{ width: 100 }}>بالدولار</th>
                <th style={{ width: 90 }}>الفواتير</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id}>
                  <td data-label="التاريخ" style={{ direction: 'ltr', textAlign: 'right' }}>{tx.occurred_on}</td>
                  <td data-label="النوع">
                    <span className={'tx-pill ' + (tx.type === 'donation' ? 'tx-in' : 'tx-out')}>
                      {tx.type === 'donation' ? 'تبرع' : 'مشترى'}
                    </span>
                  </td>
                  <td data-label="البيان">
                    <Link href={`/admin/accounting/tx/${tx.id}`} className="tx-link" style={{ fontWeight: 600 }}>
                      {tx.type === 'purchase' ? (tx.item || '—') : (tx.party || '—')}
                    </Link>
                    {(() => {
                      const sub = [tx.type === 'purchase' ? tx.party : null, tx.description].filter(Boolean).join(' · ');
                      return sub ? <div style={{ fontSize: 12.5, color: 'var(--mawkab-muted)' }}>{sub}</div> : null;
                    })()}
                  </td>
                  <td data-label="الفئة">{tx.category_name || (tx.type === 'purchase' ? 'غير مصنّف' : '—')}</td>
                  <td data-label="المبلغ">{amt(tx.amount)} <span style={{ color: 'var(--mawkab-muted)', fontSize: 12 }}>{tx.currency}</span></td>
                  <td data-label="بالدولار" style={{ fontWeight: 700 }}>{usd(tx.amount_usd)}</td>
                  <td data-label="الفواتير">
                    {tx.images.length ? (
                      <div className="inv-thumbs">
                        {tx.images.map((im) => (
                          <a key={im.id} href={im.url} target="_blank" rel="noreferrer" title="عرض الفاتورة">
                            <img src={im.url} alt="فاتورة" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--mawkab-muted)' }}>—</span>
                    )}
                  </td>
                  <td data-label="">
                    <div className="acts">
                      <Link href={`/admin/accounting/tx/${tx.id}`} className="btn-small">تفاصيل</Link>
                      {!readOnly ? (
                        <>
                          <button className="btn-small" onClick={() => setModal({ type: tx.type, existing: tx })}>تعديل</button>
                          <button
                            className="btn-danger"
                            onClick={async () => {
                              if (window.confirm('حذف هذه الحركة؟')) { await api.removeTransaction(tx.id); load(); }
                            }}
                          >حذف</button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <TransactionModal
          type={modal.type}
          existing={modal.existing}
          categories={data.categories}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      ) : null}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="page">
      <SiteHeader variant="private" />
      <main className="main-wrap">{children}</main>
      <SiteFooter />
    </div>
  );
}

function RatesPanel({ rates, onSaved, readOnly = false }) {
  const [iqd, setIqd] = useState(rates.IQD ?? '');
  const [kwd, setKwd] = useState(rates.KWD ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await api.setRates({ IQD: Number(iqd), KWD: Number(kwd) });
      setMsg('تم الحفظ — أُعيد احتساب كل المبالغ بالدولار');
      onSaved();
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="acc-panel">
      <h2 className="acc-h">أسعار الصرف</h2>
      <p className="acc-note">كل المبالغ تُحوَّل إلى الدولار حسب هذه الأسعار.</p>
      <div className="rate-row">
        <label>$100 =</label>
        <input type="number" inputMode="decimal" value={iqd} onChange={(e) => setIqd(e.target.value)} dir="ltr" disabled={readOnly} />
        <span>دينار عراقي</span>
      </div>
      <div className="rate-row">
        <label>$100 =</label>
        <input type="number" inputMode="decimal" value={kwd} onChange={(e) => setKwd(e.target.value)} dir="ltr" disabled={readOnly} />
        <span>دينار كويتي</span>
      </div>
      {!readOnly ? <button className="btn-add" onClick={save} disabled={busy} style={{ marginTop: 6 }}>حفظ الأسعار</button> : null}
      {msg ? <div className="acc-inline-msg">{msg}</div> : null}
    </div>
  );
}

function CategoriesPanel({ categories, onChanged, readOnly = false }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const v = name.trim();
    if (!v || busy) return;
    setBusy(true);
    try { await api.addCategory(v); setName(''); onChanged(); }
    finally { setBusy(false); }
  };

  return (
    <div className="acc-panel">
      <h2 className="acc-h">فئات المشتريات</h2>
      {!readOnly ? (
        <div className="rate-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الفئة (مثال: مواد غذائية)"
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }} style={{ flex: 1 }} />
          <button className="btn-add" onClick={add} disabled={busy}>＋</button>
        </div>
      ) : null}
      <div className="cat-chips">
        {categories.length === 0 ? <span style={{ color: 'var(--mawkab-muted)', fontSize: 13 }}>لا توجد فئات بعد</span> : null}
        {categories.map((c) => (
          <span key={c.id} className="cat-chip">
            {c.name}
            {!readOnly ? (
              <button onClick={async () => { if (window.confirm('حذف فئة «' + c.name + '»؟')) { await api.removeCategory(c.id); onChanged(); } }}>×</button>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
