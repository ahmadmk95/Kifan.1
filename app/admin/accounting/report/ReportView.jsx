'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

function usd(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function amt(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

export default function ReportView() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const generatedAt = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  useEffect(() => { api.accounting().then(setData).catch(() => setErr(true)); }, []);

  if (err) return <div style={{ padding: 40 }}>تعذّر تحميل البيانات</div>;
  if (!data) return <div style={{ padding: 40, color: '#8A8163' }}>جارٍ التحميل…</div>;

  const t = data.totals;

  return (
    <div className="report-wrap">
      {/* Screen-only toolbar */}
      <div className="report-bar no-print">
        <Link href="/admin/accounting" className="btn-ghost">← رجوع للمحاسبة</Link>
        <button className="btn-add" onClick={() => window.print()}>🖶 طباعة / حفظ PDF</button>
      </div>

      <div className="report-page">
        <div className="report-head">
          <img src="/logo.png" alt="الشعار" />
          <div>
            <h1>التقرير المالي</h1>
            <div className="rh-sub">موكب أمير المؤمنين (ع) — زيارة الأربعين 2026</div>
            <div className="rh-date">تاريخ التقرير: {generatedAt}</div>
          </div>
        </div>

        <div className="report-summary">
          <div className="rs-cell"><div className="rs-label">إجمالي التبرعات</div><div className="rs-val in">{usd(t.donations_usd)}</div></div>
          <div className="rs-cell"><div className="rs-label">إجمالي المشتريات</div><div className="rs-val out">{usd(t.purchases_usd)}</div></div>
          <div className="rs-cell"><div className="rs-label">الرصيد المتبقّي</div><div className="rs-val">{usd(t.balance_usd)}</div></div>
        </div>

        <div className="report-meta">
          أسعار الصرف المعتمدة: $100 = {amt(data.rates.IQD)} دينار عراقي · $100 = {amt(data.rates.KWD)} دينار كويتي.
          جميع المبالغ محوّلة إلى الدولار الأمريكي.
        </div>

        {data.by_category.length > 0 && (
          <>
            <h2 className="report-h2">المشتريات حسب الفئة</h2>
            <table className="report-table">
              <thead><tr><th>الفئة</th><th style={{ width: 140 }}>المبلغ بالدولار</th></tr></thead>
              <tbody>
                {data.by_category.map((c) => (
                  <tr key={c.name}><td>{c.name}</td><td>{usd(c.usd)}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2 className="report-h2">تفاصيل الحركات</h2>
        {data.transactions.length === 0 ? (
          <p style={{ color: '#8A8163' }}>لا توجد حركات.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>التاريخ</th>
                <th style={{ width: 60 }}>النوع</th>
                <th>البيان</th>
                <th style={{ width: 110 }}>الفئة</th>
                <th style={{ width: 120 }}>المبلغ</th>
                <th style={{ width: 100 }}>بالدولار</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ direction: 'ltr', textAlign: 'right' }}>{tx.occurred_on}</td>
                  <td>{tx.type === 'donation' ? 'تبرع' : 'مشترى'}</td>
                  <td>
                    {tx.type === 'purchase' ? (tx.item || '—') : (tx.party || '—')}
                    {(() => {
                      const sub = [tx.type === 'purchase' ? tx.party : null, tx.description].filter(Boolean).join(' · ');
                      return sub ? <span style={{ color: '#8A8163' }}> — {sub}</span> : null;
                    })()}
                  </td>
                  <td>{tx.category_name || (tx.type === 'purchase' ? 'غير مصنّف' : '—')}</td>
                  <td>{amt(tx.amount)} {tx.currency}</td>
                  <td>{usd(tx.amount_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="report-foot">۞ موكب أمير المؤمنين (ع) · التقرير المالي ۞</div>
      </div>
    </div>
  );
}
