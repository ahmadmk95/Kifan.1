'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Dropdown from '@/components/Dropdown';
import { api } from '@/lib/api';
import { fmtCur, fmtDateTime } from '@/lib/money';
import { getActiveProfile, setActiveProfile } from '@/lib/accProfile';

// Convert an amount in `currency` to USD using saved rates ($100 = per_100 units).
function toUsd(amount, currency, rates) {
  if (currency === 'USD') return Number(amount) || 0;
  const per100 = rates?.[currency];
  if (!per100 || per100 <= 0) return 0;
  return (Number(amount) * 100) / per100;
}

const DISPLAY_CURRENCIES = [
  { value: 'USD', label: 'دولار $' },
  { value: 'IQD', label: 'دينار عراقي' },
  { value: 'KWD', label: 'دينار كويتي' },
];

// Cash counted in custody is entered per physical currency.
const COUNT_FIELDS = [
  { key: 'USD', label: 'دولار $', hint: 'المبلغ نقداً بالدولار' },
  { key: 'IQD', label: 'دينار عراقي', hint: 'المبلغ نقداً بالدينار العراقي' },
  { key: 'KWD', label: 'دينار كويتي', hint: 'المبلغ نقداً بالدينار الكويتي' },
];

const TOLERANCE = 0.05; // ±5% is considered a match

export default function ReconcileView({ readOnly = false }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cur, setCur] = useState('USD');
  const [counts, setCounts] = useState({ USD: '', IQD: '', KWD: '' });
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [history, setHistory] = useState([]);

  const load = (pid) => api.accounting(pid).then((d) => {
    setData(d);
    if (d.active_profile) { setProfile(d.active_profile); setActiveProfile(d.active_profile); }
    api.reconciliations(d.active_profile).then((r) => setHistory(r.reconciliations || [])).catch(() => {});
  }).catch(() => setErr('تعذّر تحميل البيانات'));
  useEffect(() => { load(getActiveProfile()); }, []);

  const changeProfile = (pid) => {
    if (!pid || pid === profile) return;
    setActiveProfile(pid);
    setProfile(pid);
    setData(null);
    setChecked(false);
    setSaveMsg(null);
    setHistory([]);
    load(pid);
  };

  const setCount = (k, v) => { setCounts((s) => ({ ...s, [k]: v })); setChecked(false); setSaveMsg(null); };

  const hasAnyCount = COUNT_FIELDS.some((f) => Number(counts[f.key]) > 0);

  // Run the check and, for users with write access, save it to the history.
  const checkNow = async () => {
    setChecked(true);
    setSaveMsg(null);
    if (readOnly || saving) return;
    setSaving(true);
    try {
      const pid = profile || data.active_profile;
      await api.saveReconciliation({ profile: pid, counts: {
        USD: Number(counts.USD) || 0, IQD: Number(counts.IQD) || 0, KWD: Number(counts.KWD) || 0,
      }, note: note.trim() || null });
      setSaveMsg('تم حفظ عملية المطابقة');
      const r = await api.reconciliations(pid);
      setHistory(r.reconciliations || []);
    } catch (e) {
      setSaveMsg(e.message || 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // Total counted cash, converted to USD using the saved exchange rates.
  const countedUsd = useMemo(() => {
    if (!data) return 0;
    return COUNT_FIELDS.reduce((sum, f) => {
      const n = Number(counts[f.key]);
      if (!Number.isFinite(n) || n <= 0) return sum;
      return sum + toUsd(n, f.key, data.rates);
    }, 0);
  }, [counts, data]);

  const systemUsd = data?.totals?.balance_usd ?? 0;
  const diffUsd = countedUsd - systemUsd; // + surplus (زيادة) / - shortage (عجز)
  const base = Math.abs(systemUsd);
  const pct = base > 0 ? (Math.abs(diffUsd) / base) * 100 : (Math.abs(diffUsd) < 0.01 ? 0 : 100);
  const withinTolerance = base > 0 ? Math.abs(diffUsd) / base <= TOLERANCE : Math.abs(diffUsd) < 0.01;

  if (err) return <Shell><div className="form-msg err">{err}</div></Shell>;
  if (!data) return <Shell><p style={{ color: 'var(--mawkab-muted)' }}>جارٍ التحميل…</p></Shell>;

  const show = (v) => fmtCur(v, cur, data.rates);
  const pctText = pct.toLocaleString('en-US', { maximumFractionDigits: 1 });

  return (
    <Shell>
      <div className="admin-bar">
        <h1>مطابقة العهدة</h1>
        <div className="admin-actions">
          <Link href="/admin/accounting" className="btn-ghost">← المحاسبة</Link>
        </div>
      </div>

      {/* Account book (profile) selector */}
      <div className="profile-bar">
        <span className="profile-label">الحساب:</span>
        <Dropdown
          value={profile || data.active_profile}
          onChange={changeProfile}
          options={(data.profiles || []).map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>

      <p className="acc-note" style={{ marginTop: 0 }}>
        أدخل المبلغ النقدي الموجود فعلياً في العهدة بكل عملة، وسيقارنه النظام بالرصيد المسجّل.
        يُعتبر الفرق ضمن ±٥٪ مطابقاً.
      </p>

      {/* Cash count inputs */}
      <div className="acc-panel">
        <h2 className="acc-h">النقد الموجود في العهدة</h2>
        <div className="recon-inputs">
          {COUNT_FIELDS.map((f) => (
            <div className="form-field" key={f.key}>
              <label>{f.label}</label>
              <input
                type="number"
                inputMode="decimal"
                dir="ltr"
                placeholder="0"
                value={counts[f.key]}
                onChange={(e) => setCount(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        {!readOnly ? (
          <div className="form-field" style={{ marginBottom: 12 }}>
            <label>ملاحظة (اختياري)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: جرد نهاية الأسبوع" />
          </div>
        ) : null}
        <button className="btn-add" onClick={checkNow} disabled={saving || !hasAnyCount}>
          {saving ? 'جارٍ الحفظ…' : readOnly ? 'تحقّق من المطابقة' : 'تحقّق واحفظ'}
        </button>
        {saveMsg ? <div className="acc-inline-msg">{saveMsg}</div> : null}
      </div>

      {checked ? (
        <>
          {/* Currency toggle for the summary figures */}
          <div className="cur-toggle">
            {DISPLAY_CURRENCIES.map((c) => (
              <button key={c.value} className={'ct' + (cur === c.value ? ' active' : '')} onClick={() => setCur(c.value)}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Verdict */}
          <div className={'recon-verdict ' + (withinTolerance ? 'ok' : 'bad')}>
            <span className="rv-icon">{withinTolerance ? '✅' : '⚠️'}</span>
            <div className="rv-text">
              <strong>
                {withinTolerance
                  ? 'مطابق — أنت في المكان الصحيح'
                  : diffUsd > 0
                    ? 'زيادة في العهدة'
                    : 'عجز في العهدة'}
              </strong>
              <span>
                {withinTolerance
                  ? `الفرق ضمن الحدّ المسموح (${pctText}٪)`
                  : diffUsd > 0
                    ? `لديك مبلغ زائد عن المسجّل قدره ${show(Math.abs(diffUsd))} (${pctText}٪)`
                    : `ينقص عن المسجّل مبلغ قدره ${show(Math.abs(diffUsd))} (${pctText}٪)`}
              </span>
            </div>
          </div>

          {/* Figures */}
          <div className="stat-cards acc-cards">
            <div className="stat-card acc-bal">
              <div className="sc-value">{show(systemUsd)}</div>
              <div className="sc-label">الرصيد المسجّل في النظام</div>
            </div>
            <div className="stat-card acc-in">
              <div className="sc-value">{show(countedUsd)}</div>
              <div className="sc-label">المعدود في العهدة</div>
            </div>
            <div className={'stat-card ' + (withinTolerance ? 'acc-bal' : 'acc-neg')}>
              <div className="sc-value">{(diffUsd >= 0 ? '+' : '−') + show(Math.abs(diffUsd)).replace(/^[−-]/, '')}</div>
              <div className="sc-label">الفرق</div>
            </div>
          </div>
        </>
      ) : null}

      {/* Saved reconciliation history for this book */}
      <div className="acc-toolbar" style={{ marginTop: 24 }}>
        <h2 className="acc-h" style={{ margin: 0 }}>سجلّ المطابقات</h2>
      </div>
      {history.length === 0 ? (
        <p style={{ color: 'var(--mawkab-muted)' }}>لا توجد عمليات مطابقة محفوظة لهذا الحساب بعد.</p>
      ) : (
        <div className="recon-history">
          {history.map((h) => {
            const d = Number(h.counted_usd) - Number(h.system_usd);
            const ok = !!h.within_tol;
            const parts = [];
            if (Number(h.usd_amount) > 0) parts.push(`${fmtCur(Number(h.usd_amount), 'USD', data.rates)}`);
            if (Number(h.iqd_amount) > 0) parts.push(`${Number(h.iqd_amount).toLocaleString('en-US')} د.ع`);
            if (Number(h.kwd_amount) > 0) parts.push(`${Number(h.kwd_amount).toLocaleString('en-US')} د.ك`);
            return (
              <div className="recon-row" key={h.id}>
                <span className={'recon-badge ' + (ok ? 'ok' : 'bad')}>{ok ? '✔ مطابق' : (d > 0 ? '▲ زيادة' : '▼ عجز')}</span>
                <div className="recon-row-main">
                  <span className="recon-row-date" dir="ltr">{fmtDateTime(h.created_at)}</span>
                  <span className="recon-row-counts">{parts.join(' + ') || '—'}</span>
                  {h.note ? <span className="recon-row-note">📝 {h.note}</span> : null}
                  {h.checked_by ? <span className="recon-row-by">— {h.checked_by}</span> : null}
                </div>
                <div className="recon-row-nums">
                  <span>المعدود {fmtCur(Number(h.counted_usd), cur, data.rates)}</span>
                  <span>المسجّل {fmtCur(Number(h.system_usd), cur, data.rates)}</span>
                  <span className={ok ? 'ok' : 'bad'}>
                    الفرق {(d >= 0 ? '+' : '−') + fmtCur(Math.abs(d), cur, data.rates).replace(/^[−-]/, '')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
