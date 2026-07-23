'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TransactionModal from '@/components/TransactionModal';
import { api } from '@/lib/api';
import { usd, amt } from '@/lib/money';
import { getActiveProfile, setActiveProfile } from '@/lib/accProfile';

export default function TransactionsView({ readOnly = false }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [modal, setModal] = useState(null); // { type, existing? } | null
  const [filter, setFilter] = useState('all');
  const [profile, setProfile] = useState(null);

  const load = () => api.accounting(getActiveProfile()).then((d) => {
    setData(d);
    if (d.active_profile) { setProfile(d.active_profile); setActiveProfile(d.active_profile); }
  }).catch(() => setErr('تعذّر تحميل البيانات'));
  useEffect(() => { load(); }, []);

  const profileName = data?.profiles?.find((p) => p.id === (profile || data.active_profile))?.name || '';

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.transactions;
    return data.transactions.filter((t) => t.type === filter);
  }, [data, filter]);

  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>الحركات{profileName ? ` — ${profileName}` : ''}</h1>
          <div className="admin-actions">
            <Link href="/admin/accounting" className="btn-ghost">← رجوع للمحاسبة</Link>
            {!readOnly && data ? (
              <>
                <button className="btn-add" onClick={() => setModal({ type: 'donation' })}>＋ تبرع</button>
                <button className="btn-add btn-out" onClick={() => setModal({ type: 'purchase' })}>＋ مشترى</button>
              </>
            ) : null}
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
                {[['all', 'الكل'], ['donation', 'تبرعات'], ['purchase', 'مشتريات']].map(([k, l]) => (
                  <button key={k} className={'ft' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>{l}</button>
                ))}
              </div>
              <span style={{ color: 'var(--mawkab-muted)', fontSize: 13.5 }}>{filtered.length} حركة</span>
            </div>

            {filtered.length === 0 ? (
              <p style={{ color: 'var(--mawkab-muted)' }}>لا توجد حركات.</p>
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
          </>
        )}
      </main>
      <SiteFooter />

      {modal && data ? (
        <TransactionModal
          type={modal.type}
          existing={modal.existing}
          categories={data.categories}
          suggestions={data.suggestions}
          profileId={profile || data.active_profile}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      ) : null}
    </div>
  );
}
