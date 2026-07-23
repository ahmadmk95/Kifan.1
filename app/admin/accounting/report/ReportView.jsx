'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { api } from '@/lib/api';
import { fmtCur, amt, today } from '@/lib/money';

const DISPLAY_CURRENCIES = [
  { value: 'USD', label: 'دولار $' },
  { value: 'IQD', label: 'دينار عراقي' },
  { value: 'KWD', label: 'دينار كويتي' },
];

export default function ReportView() {
  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);
  const [cur, setCur] = useState('USD');
  const [err, setErr] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const now = new Date();
  const generatedAt = now.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Baghdad' });
  const stmtNo = 'MAW-' + today().replace(/-/g, '');

  useEffect(() => {
    api.accounting().then(setData).catch(() => setErr(true));
    api.me().then(({ user }) => setMe(user)).catch(() => {});
  }, []);

  // Build a proper A4 PDF file from the rendered statement (not a browser print).
  const exportPdf = async () => {
    if (pdfBusy) return;
    const el = document.getElementById('statement-doc');
    if (!el) return;
    setPdfBusy(true);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const [{ default: html2canvas }, jspdf] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const JsPDF = jspdf.jsPDF || jspdf.default;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const pdf = new JsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      // Fit the whole statement onto a single A4 page (preserve aspect ratio).
      const margin = 6;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;
      const aspect = canvas.width / canvas.height;
      let renderW = availW;
      let renderH = renderW / aspect;
      if (renderH > availH) { renderH = availH; renderW = renderH * aspect; }
      const x = (pageW - renderW) / 2;
      pdf.addImage(imgData, 'JPEG', x, margin, renderW, renderH);
      pdf.save(`Mawkab-Statement-${stmtNo}.pdf`);
    } catch (e) {
      setErr(false);
      window.alert('تعذّر إنشاء ملف PDF. حاول مرة أخرى.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="no-print"><SiteHeader variant="private" /></div>
      <main className="main-wrap report-wrap">
        <div className="report-bar no-print">
          <Link href="/admin/accounting" className="btn-ghost">← رجوع للمحاسبة</Link>
          <div className="cur-toggle" style={{ margin: 0 }}>
            {DISPLAY_CURRENCIES.map((c) => (
              <button key={c.value} className={'ct' + (cur === c.value ? ' active' : '')} onClick={() => setCur(c.value)}>
                {c.label}
              </button>
            ))}
          </div>
          <button className="btn-add" onClick={exportPdf} disabled={!data || pdfBusy}>
            {pdfBusy ? 'جارٍ إنشاء PDF…' : '⬇ تنزيل PDF'}
          </button>
        </div>

        {err ? (
          <div className="form-msg err">تعذّر تحميل البيانات</div>
        ) : !data ? (
          <p style={{ color: 'var(--mawkab-muted)' }}>جارٍ التحميل…</p>
        ) : (
          <ReportDoc data={data} cur={cur} generatedAt={generatedAt} stmtNo={stmtNo} me={me} />
        )}
      </main>
      <div className="no-print"><SiteFooter /></div>
    </div>
  );
}

function ReportDoc({ data, cur, generatedAt, stmtNo, me }) {
  const show = (v) => fmtCur(v, cur, data.rates);
  // Signed format for balances that can go negative — cleaner than "$-3.82".
  const showSigned = (v) => (v < 0 ? '−' + fmtCur(Math.abs(v), cur, data.rates) : fmtCur(v, cur, data.rates));
  const curLabel = DISPLAY_CURRENCIES.find((c) => c.value === cur)?.label || cur;

  // Chronological ledger (oldest first) with a running balance — statement style.
  const ledger = [...data.transactions].sort((a, b) => {
    if (a.occurred_on !== b.occurred_on) return a.occurred_on < b.occurred_on ? -1 : 1;
    return (a.created_at || '') < (b.created_at || '') ? -1 : 1;
  });
  let bal = 0;
  const rows = ledger.map((tx) => {
    const inc = tx.type === 'donation' ? tx.amount_usd : 0;
    const out = tx.type === 'purchase' ? tx.amount_usd : 0;
    bal += inc - out;
    return { tx, inc, out, bal };
  });

  const t = data.totals;
  const period = ledger.length ? `${ledger[0].occurred_on}  ←→  ${ledger[ledger.length - 1].occurred_on}` : '—';

  return (
    <div className="report-page statement" id="statement-doc">
      {/* Letterhead */}
      <div className="stmt-head">
        <div className="stmt-brand">
          <img src="/logo.png" alt="شعار الموكب" />
          <div>
            <div className="stmt-org">موكب أمير المؤمنين (ع)</div>
            <div className="stmt-org-sub">دليل تعليمات العمل — زيارة الأربعين 2026</div>
          </div>
        </div>
        <div className="stmt-title-box">
          <div className="stmt-title">كشف حساب</div>
          <div className="stmt-sub">Account Statement</div>
        </div>
      </div>

      {/* Statement meta */}
      <div className="stmt-meta">
        <div className="stmt-meta-cell"><span>رقم الكشف</span><b dir="ltr">{stmtNo}</b></div>
        <div className="stmt-meta-cell"><span>فترة الكشف</span><b dir="ltr">{period}</b></div>
        <div className="stmt-meta-cell"><span>عملة الكشف</span><b>{curLabel}</b></div>
        <div className="stmt-meta-cell"><span>تاريخ الإصدار</span><b dir="ltr">{generatedAt}</b></div>
      </div>

      {/* Account summary */}
      <div className="stmt-summary">
        <div className="stmt-sum-cell">
          <div className="ssc-label">الرصيد الافتتاحي</div>
          <div className="ssc-val">{show(0)}</div>
        </div>
        <div className="stmt-sum-cell">
          <div className="ssc-label">إجمالي الوارد (تبرعات)</div>
          <div className="ssc-val in">{show(t.donations_usd)}</div>
        </div>
        <div className="stmt-sum-cell">
          <div className="ssc-label">إجمالي الصادر (مشتريات)</div>
          <div className="ssc-val out">{show(t.purchases_usd)}</div>
        </div>
        <div className="stmt-sum-cell strong">
          <div className="ssc-label">الرصيد الختامي</div>
          <div className={'ssc-val ' + (t.balance_usd < 0 ? 'out' : '')}>{showSigned(t.balance_usd)}</div>
        </div>
      </div>

      {/* Ledger */}
      <section className="rpt-section">
        <h2 className="stmt-h2">تفاصيل الحركات</h2>
        <table className="stmt-table">
          <thead>
            <tr>
              <th style={{ width: 34 }}>#</th>
              <th style={{ width: 82 }}>التاريخ</th>
              <th>البيان</th>
              <th style={{ width: 96 }}>الفئة</th>
              <th style={{ width: 92 }}>وارد</th>
              <th style={{ width: 92 }}>صادر</th>
              <th style={{ width: 100 }}>الرصيد</th>
            </tr>
          </thead>
          <tbody>
            <tr className="stmt-opening">
              <td></td>
              <td dir="ltr" style={{ textAlign: 'right' }}>{ledger.length ? ledger[0].occurred_on : ''}</td>
              <td colSpan={3}>الرصيد الافتتاحي</td>
              <td></td>
              <td className="num strong">{show(0)}</td>
            </tr>
            {rows.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--mawkab-muted)' }}>لا توجد حركات.</td></tr>
            ) : rows.map((r, i) => {
              const sub = [r.tx.type === 'purchase' ? r.tx.party : null, r.tx.description].filter(Boolean).join(' · ');
              const orig = `${amt(r.tx.amount)} ${r.tx.currency}`;
              return (
                <tr key={r.tx.id}>
                  <td className="num">{i + 1}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{r.tx.occurred_on}</td>
                  <td>
                    <span className="stmt-desc">{r.tx.type === 'purchase' ? (r.tx.item || '—') : (r.tx.party || 'تبرع')}</span>
                    {sub ? <span className="stmt-desc-sub"> — {sub}</span> : null}
                    {r.tx.currency !== 'USD' ? <span className="stmt-orig"> ({orig})</span> : null}
                  </td>
                  <td>{r.tx.type === 'purchase' ? (r.tx.category_name || 'غير مصنّف') : '—'}</td>
                  <td className="num in">{r.inc ? show(r.inc) : '—'}</td>
                  <td className="num out">{r.out ? show(r.out) : '—'}</td>
                  <td className={'num strong' + (r.bal < 0 ? ' out' : '')}>{showSigned(r.bal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="stmt-totals">
              <td colSpan={4}>الإجماليات</td>
              <td className="num in">{show(t.donations_usd)}</td>
              <td className="num out">{show(t.purchases_usd)}</td>
              <td className="num strong">{showSigned(t.balance_usd)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Category breakdown */}
      {data.by_category.length > 0 && (
        <section className="rpt-section">
          <h2 className="stmt-h2">المشتريات حسب الفئة</h2>
          <table className="stmt-table">
            <thead><tr><th>الفئة</th><th style={{ width: 140 }}>المبلغ</th></tr></thead>
            <tbody>
              {data.by_category.map((c) => (
                <tr key={c.name}><td>{c.name}</td><td className="num">{show(c.usd)}</td></tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="stmt-totals"><td>الإجمالي</td><td className="num out">{show(t.purchases_usd)}</td></tr>
            </tfoot>
          </table>
        </section>
      )}

      <div className="stmt-rates">
        أسعار الصرف المعتمدة: <b>$100 = {amt(data.rates.IQD)}</b> دينار عراقي ·
        <b> $100 = {amt(data.rates.KWD)}</b> دينار كويتي.
      </div>

      {/* Signatures */}
      <div className="stmt-signs">
        <div className="stmt-sign">
          <div className="stmt-sign-line" />
          <div>أمين الصندوق{me?.name ? `: ${me.name}` : ''}</div>
        </div>
        <div className="stmt-sign">
          <div className="stmt-sign-line" />
          <div>المدقّق / المسؤول</div>
        </div>
      </div>

      <div className="stmt-foot">
        هذا الكشف صادر إلكترونياً من نظام محاسبة موكب أمير المؤمنين (ع) · {generatedAt} · جميع المبالغ بعملة {curLabel}
      </div>
    </div>
  );
}
