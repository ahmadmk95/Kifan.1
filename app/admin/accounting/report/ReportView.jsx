'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { api } from '@/lib/api';
import { fmtCur, amt, today } from '@/lib/money';
import { getActiveProfile } from '@/lib/accProfile';

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
    api.accounting(getActiveProfile()).then(setData).catch(() => setErr(true));
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
      const margin = 6;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;
      const aspect = canvas.width / canvas.height;
      // Scale to the page width; keep it on ONE page when it fits, and only
      // split across pages when the statement is genuinely taller than A4
      // (otherwise the text would be shrunk past readability).
      const renderW = availW;
      const renderH = renderW / aspect;
      if (renderH <= availH) {
        pdf.addImage(imgData, 'JPEG', margin, margin, renderW, renderH);
      } else {
        const pages = Math.ceil(renderH / availH);
        for (let i = 0; i < pages; i += 1) {
          if (i > 0) pdf.addPage();
          // Shift the image up by one page each time; jsPDF clips to the page.
          pdf.addImage(imgData, 'JPEG', margin, margin - i * availH, renderW, renderH);
        }
      }
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

  // Chronological (oldest first), then split into income and outgoings so each
  // side of the statement is read on its own.
  const ledger = [...data.transactions].sort((a, b) => {
    if (a.occurred_on !== b.occurred_on) return a.occurred_on < b.occurred_on ? -1 : 1;
    return (a.created_at || '') < (b.created_at || '') ? -1 : 1;
  });
  const income = ledger.filter((tx) => tx.type === 'donation' && !tx.pending);
  const outgoing = ledger.filter((tx) => tx.type === 'purchase' && !tx.pending);
  const pledged = ledger.filter((tx) => tx.type === 'donation' && tx.pending);
  const due = ledger.filter((tx) => tx.type === 'purchase' && tx.pending);
  const origOf = (tx) => (tx.currency !== 'USD' ? ` (${amt(tx.amount)} ${tx.currency})` : '');

  // Outgoings are grouped so each category stands on its own with a subtotal.
  const outByCategory = (() => {
    const map = new Map();
    for (const tx of outgoing) {
      const name = tx.category_name || 'غير مصنّف';
      if (!map.has(name)) map.set(name, { name, rows: [], total: 0 });
      const g = map.get(name);
      g.rows.push(tx);
      g.total += Number(tx.amount_usd) || 0;
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  })();

  const t = data.totals;

  // ── Analysis ────────────────────────────────────────────────────────────
  const totalIn = Number(t.donations_usd) || 0;
  const totalOut = Number(t.purchases_usd) || 0;
  const spendRatio = totalIn > 0 ? (totalOut / totalIn) * 100 : 0;
  const keepRatio = totalIn > 0 ? (t.balance_usd / totalIn) * 100 : 0;
  const avgIn = income.length ? totalIn / income.length : 0;
  const avgOut = outgoing.length ? totalOut / outgoing.length : 0;
  const topCat = outByCategory[0] || null;
  const pctOf = (v, whole) => (whole > 0 ? (v / whole) * 100 : 0);
  const pctTxt = (v) => v.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '٪';

  // Month-by-month movement (collected income vs paid outgoings).
  const monthly = (() => {
    const map = new Map();
    const bump = (d, key, v) => {
      const m = String(d || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(m)) return;
      if (!map.has(m)) map.set(m, { key: m, in: 0, out: 0 });
      map.get(m)[key] += Number(v) || 0;
    };
    for (const tx of income) bump(tx.occurred_on, 'in', tx.amount_usd);
    for (const tx of outgoing) bump(tx.occurred_on, 'out', tx.amount_usd);
    return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  })();
  const monthlyMax = monthly.reduce((m, x) => Math.max(m, x.in, x.out), 0);

  // Biggest counterparties on each side.
  const topBy = (list, field) => {
    const map = new Map();
    for (const tx of list) {
      const name = (tx[field] || '').trim() || 'غير محدّد';
      map.set(name, (map.get(name) || 0) + (Number(tx.amount_usd) || 0));
    }
    return [...map.entries()].map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total).slice(0, 5);
  };
  const topDonors = topBy(income, 'party');
  const topVendors = topBy(outgoing, 'party');

  const period = ledger.length ? `${ledger[0].occurred_on}  ←→  ${ledger[ledger.length - 1].occurred_on}` : '—';
  const profileName = (data.profiles || []).find((p) => p.id === data.active_profile)?.name || '';

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
          {profileName ? <div className="stmt-account">{profileName}</div> : null}
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

      {/* ── الوارد (income) ── */}
      <section className="rpt-section">
        <h2 className="stmt-h2 side-in">أولاً: الوارد — التبرعات</h2>
        <table className="stmt-table">
          <thead>
            <tr>
              <th style={{ width: 34 }}>#</th>
              <th style={{ width: 82 }}>التاريخ</th>
              <th>المتبرّع</th>
              <th>البيان</th>
              <th style={{ width: 110 }}>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {income.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--mawkab-muted)' }}>لا توجد تبرعات.</td></tr>
            ) : income.map((tx, i) => (
              <tr key={tx.id}>
                <td className="num">{i + 1}</td>
                <td dir="ltr" style={{ textAlign: 'right' }}>{tx.occurred_on}</td>
                <td><span className="stmt-desc">{tx.party || 'تبرع'}</span></td>
                <td>
                  <span className="stmt-desc-sub">{tx.description || '—'}</span>
                  {origOf(tx) ? <span className="stmt-orig">{origOf(tx)}</span> : null}
                </td>
                <td className="num in">{show(tx.amount_usd)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="stmt-totals">
              <td colSpan={4}>إجمالي الوارد</td>
              <td className="num in">{show(t.donations_usd)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* ── الصادر (outgoings) ── */}
      <section className="rpt-section">
        <h2 className="stmt-h2 side-out">ثانياً: الصادر — المشتريات (مفصّلة حسب الفئة)</h2>
        <table className="stmt-table">
          <thead>
            <tr>
              <th style={{ width: 34 }}>#</th>
              <th style={{ width: 82 }}>التاريخ</th>
              <th>الصنف / المادة</th>
              <th>المورّد / البيان</th>
              <th style={{ width: 110 }}>المبلغ</th>
            </tr>
          </thead>
          {outByCategory.length === 0 ? (
            <tbody>
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--mawkab-muted)' }}>لا توجد مشتريات.</td></tr>
            </tbody>
          ) : outByCategory.map((g) => (
            <tbody key={g.name} className="stmt-group">
              <tr className="stmt-group-head">
                <td colSpan={4}>{g.name}</td>
                <td className="num">{g.rows.length} حركة</td>
              </tr>
              {g.rows.map((tx, i) => {
                const sub = [tx.party, tx.description].filter(Boolean).join(' · ');
                return (
                  <tr key={tx.id}>
                    <td className="num">{i + 1}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{tx.occurred_on}</td>
                    <td><span className="stmt-desc">{tx.item || '—'}</span></td>
                    <td>
                      <span className="stmt-desc-sub">{sub || '—'}</span>
                      {origOf(tx) ? <span className="stmt-orig">{origOf(tx)}</span> : null}
                    </td>
                    <td className="num out">{show(tx.amount_usd)}</td>
                  </tr>
                );
              })}
              <tr className="stmt-subtotal">
                <td colSpan={4}>مجموع «{g.name}»</td>
                <td className="num out">{show(g.total)}</td>
              </tr>
            </tbody>
          ))}
          <tfoot>
            <tr className="stmt-totals">
              <td colSpan={4}>إجمالي الصادر</td>
              <td className="num out">{show(t.purchases_usd)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* ── Net result ── */}
      <section className="rpt-section">
        <table className="stmt-table stmt-net">
          <tbody>
            <tr><td>إجمالي الوارد (تبرعات محصّلة)</td><td className="num in">{show(t.donations_usd)}</td></tr>
            <tr><td>إجمالي الصادر (مشتريات مدفوعة)</td><td className="num out">− {show(t.purchases_usd)}</td></tr>
            <tr className="stmt-totals">
              <td>الرصيد المتبقّي (الوارد − الصادر)</td>
              <td className={'num strong' + (t.balance_usd < 0 ? ' out' : '')}>{showSigned(t.balance_usd)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── تحليل ومؤشرات ── */}
      <section className="rpt-section an-block">
        <h2 className="stmt-h2">تحليل الكشف والمؤشرات</h2>

        <div className="an-kpis">
          <div className="an-kpi">
            <div className="an-kpi-val out">{pctTxt(spendRatio)}</div>
            <div className="an-kpi-lbl">نسبة الإنفاق من الوارد</div>
          </div>
          <div className="an-kpi">
            <div className={'an-kpi-val ' + (t.balance_usd < 0 ? 'out' : 'in')}>{pctTxt(keepRatio)}</div>
            <div className="an-kpi-lbl">المتبقّي من الوارد</div>
          </div>
          <div className="an-kpi">
            <div className="an-kpi-val">{show(avgIn)}</div>
            <div className="an-kpi-lbl">متوسط التبرع ({income.length} تبرع)</div>
          </div>
          <div className="an-kpi">
            <div className="an-kpi-val">{show(avgOut)}</div>
            <div className="an-kpi-lbl">متوسط المشترى ({outgoing.length} مشترى)</div>
          </div>
          <div className="an-kpi">
            <div className="an-kpi-val">{topCat ? topCat.name : '—'}</div>
            <div className="an-kpi-lbl">أعلى فئة إنفاق{topCat ? ` — ${pctTxt(pctOf(topCat.total, totalOut))}` : ''}</div>
          </div>
        </div>

        {/* Income vs outgoing — one proportional bar */}
        <div className="an-chart">
          <div className="an-chart-h">الوارد مقابل الصادر</div>
          <div className="an-split">
            <span className="an-split-in" style={{ width: pctOf(totalIn, Math.max(totalIn, totalOut) || 1) + '%' }}>
              <b>وارد</b> {show(totalIn)}
            </span>
            <span className="an-split-out" style={{ width: pctOf(totalOut, Math.max(totalIn, totalOut) || 1) + '%' }}>
              <b>صادر</b> {show(totalOut)}
            </span>
          </div>
        </div>

        {/* Spending by category — horizontal bars */}
        {outByCategory.length > 0 && (
          <div className="an-chart">
            <div className="an-chart-h">توزيع الإنفاق حسب الفئة</div>
            <div className="an-bars">
              {outByCategory.map((g) => (
                <div className="an-bar-row" key={g.name}>
                  <span className="an-bar-label">{g.name}</span>
                  <span className="an-bar-track">
                    <span className="an-bar-fill" style={{ width: pctOf(g.total, totalOut) + '%' }} />
                  </span>
                  <span className="an-bar-val">{show(g.total)} <i>{pctTxt(pctOf(g.total, totalOut))}</i></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly movement — grouped columns */}
        {monthly.length > 0 && (
          <div className="an-chart">
            <div className="an-chart-h">
              الحركة الشهرية
              <span className="an-legend">
                <i className="lg in" /> وارد <i className="lg out" /> صادر
              </span>
            </div>
            <div className="an-cols">
              {monthly.map((m) => (
                <div className="an-col-group" key={m.key}>
                  <div className="an-col-bars">
                    <span className="an-col in" style={{ height: pctOf(m.in, monthlyMax) + '%' }} />
                    <span className="an-col out" style={{ height: pctOf(m.out, monthlyMax) + '%' }} />
                  </div>
                  <span className="an-col-label" dir="ltr">{m.key}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Biggest counterparties */}
        <div className="an-tops">
          <div className="an-top">
            <div className="an-chart-h">أعلى المتبرّعين</div>
            {topDonors.length === 0 ? <div className="an-empty">—</div> : topDonors.map((r) => (
              <div className="an-top-row" key={r.name}>
                <span>{r.name}</span><b className="in">{show(r.total)}</b>
              </div>
            ))}
          </div>
          <div className="an-top">
            <div className="an-chart-h">أعلى المورّدين</div>
            {topVendors.length === 0 ? <div className="an-empty">—</div> : topVendors.map((r) => (
              <div className="an-top-row" key={r.name}>
                <span>{r.name}</span><b className="out">{show(r.total)}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Not yet collected / not yet paid (outside the balance) ── */}
      {(pledged.length > 0 || due.length > 0) && (
        <section className="rpt-section">
          <h2 className="stmt-h2">بنود خارج الرصيد</h2>
          <table className="stmt-table">
            <thead>
              <tr>
                <th style={{ width: 82 }}>التاريخ</th>
                <th style={{ width: 110 }}>النوع</th>
                <th>البيان</th>
                <th style={{ width: 110 }}>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {pledged.map((tx) => (
                <tr key={tx.id}>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{tx.occurred_on}</td>
                  <td>تبرع لم يُحصّل</td>
                  <td>{tx.party || '—'}{tx.description ? ` · ${tx.description}` : ''}</td>
                  <td className="num in">{show(tx.amount_usd)}</td>
                </tr>
              ))}
              {due.map((tx) => (
                <tr key={tx.id}>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{tx.occurred_on}</td>
                  <td>مستحق لم يُدفع</td>
                  <td>{tx.item || '—'}{tx.party ? ` · ${tx.party}` : ''}</td>
                  <td className="num out">{show(tx.amount_usd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="stmt-totals">
                <td colSpan={3}>صافي البنود المعلّقة (وارد متوقّع − مستحقات)</td>
                <td className="num strong">{showSigned((t.pledged_usd || 0) - (t.pending_usd || 0))}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

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
