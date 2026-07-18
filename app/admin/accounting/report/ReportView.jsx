'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { api } from '@/lib/api';
import { usd, amt } from '@/lib/money';

export default function ReportView() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const generatedAt = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  useEffect(() => { api.accounting().then(setData).catch(() => setErr(true)); }, []);

  return (
    <div className="page">
      <div className="no-print"><SiteHeader variant="private" /></div>
      <main className="main-wrap report-wrap">
        <div className="report-bar no-print">
          <Link href="/admin/accounting" className="btn-ghost">← رجوع للمحاسبة</Link>
          <button className="btn-add" onClick={() => window.print()} disabled={!data}>🖶 طباعة / حفظ PDF</button>
        </div>

        {err ? (
          <div className="form-msg err">تعذّر تحميل البيانات</div>
        ) : !data ? (
          <p style={{ color: 'var(--mawkab-muted)' }}>جارٍ التحميل…</p>
        ) : (
          <ReportDoc data={data} generatedAt={generatedAt} />
        )}
      </main>
      <div className="no-print"><SiteFooter /></div>
    </div>
  );
}

function ReportDoc({ data, generatedAt }) {
  const t = data.totals;
  return (
    <div className="report-page">
      {/* Letterhead */}
      <div className="rpt-letterhead">
        <div className="rpt-brand">
          <img src="/logo.png" alt="شعار الموكب" />
          <div>
            <div className="rpt-org">موكب أمير المؤمنين (ع)</div>
            <div className="rpt-org-sub">دليل تعليمات العمل — زيارة الأربعين 2026</div>
          </div>
        </div>
        <div className="rpt-doc-meta">
          <div className="rpt-doc-title">التقرير المالي</div>
          <div className="rpt-doc-date">تاريخ الإصدار: {generatedAt}</div>
        </div>
      </div>
      <div className="rpt-rule" />

      {/* Summary figures */}
      <div className="rpt-summary">
        <div className="rpt-fig">
          <div className="rpt-fig-label">إجمالي التبرعات</div>
          <div className="rpt-fig-val in">{usd(t.donations_usd)}</div>
        </div>
        <div className="rpt-fig">
          <div className="rpt-fig-label">إجمالي المشتريات</div>
          <div className="rpt-fig-val out">{usd(t.purchases_usd)}</div>
        </div>
        <div className="rpt-fig strong">
          <div className="rpt-fig-label">الرصيد المتبقّي</div>
          <div className="rpt-fig-val">{usd(t.balance_usd)}</div>
        </div>
      </div>

      <div className="rpt-note">
        أسعار الصرف المعتمدة: <b>$100 = {amt(data.rates.IQD)}</b> دينار عراقي ·
        <b> $100 = {amt(data.rates.KWD)}</b> دينار كويتي. جميع المبالغ محوّلة إلى الدولار الأمريكي.
      </div>

      {data.by_category.length > 0 && (
        <section className="rpt-section">
          <h2 className="rpt-h2">المشتريات حسب الفئة</h2>
          <table className="report-table">
            <thead><tr><th>الفئة</th><th style={{ width: 150 }}>المبلغ بالدولار</th></tr></thead>
            <tbody>
              {data.by_category.map((c) => (
                <tr key={c.name}><td>{c.name}</td><td>{usd(c.usd)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="rpt-section">
        <h2 className="rpt-h2">تفاصيل الحركات ({data.transactions.length})</h2>
        {data.transactions.length === 0 ? (
          <p style={{ color: 'var(--mawkab-muted)' }}>لا توجد حركات.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ width: 88 }}>التاريخ</th>
                <th style={{ width: 55 }}>النوع</th>
                <th>البيان</th>
                <th style={{ width: 105 }}>الفئة</th>
                <th style={{ width: 115 }}>المبلغ</th>
                <th style={{ width: 95 }}>بالدولار</th>
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
                      return sub ? <span style={{ color: 'var(--mawkab-muted)' }}> — {sub}</span> : null;
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
      </section>

      {/* Signature / footer block */}
      <div className="rpt-signature">
        <div className="rpt-sign-cell">أُعدّ بواسطة: ______________________</div>
        <div className="rpt-sign-cell">التوقيع: ______________________</div>
      </div>
      <div className="report-foot">۞ موكب أمير المؤمنين (ع) · التقرير المالي · زيارة الأربعين 2026 ۞</div>
    </div>
  );
}
