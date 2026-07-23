'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TransactionModal from '@/components/TransactionModal';
import Autocomplete from '@/components/Autocomplete';
import Dropdown from '@/components/Dropdown';
import { api } from '@/lib/api';
import { fmtCur } from '@/lib/money';
import { getActiveProfile, setActiveProfile } from '@/lib/accProfile';

const DISPLAY_CURRENCIES = [
  { value: 'USD', label: 'دولار $' },
  { value: 'IQD', label: 'دينار عراقي' },
  { value: 'KWD', label: 'دينار كويتي' },
];

export default function AccountingView({ readOnly = false }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [modal, setModal] = useState(null); // { type, existing? } | null
  const [cur, setCur] = useState('USD');
  const [profile, setProfile] = useState(null);

  const load = (pid) => api.accounting(pid).then((d) => {
    setData(d);
    if (d.active_profile) { setProfile(d.active_profile); setActiveProfile(d.active_profile); }
  }).catch(() => setErr('تعذّر تحميل البيانات'));
  useEffect(() => { load(getActiveProfile()); }, []);

  const changeProfile = (pid) => {
    if (!pid || pid === profile) return;
    setActiveProfile(pid);
    setProfile(pid);
    setData(null);
    load(pid);
  };

  if (err) return <Shell><div className="form-msg err">{err}</div></Shell>;
  if (!data) return <Shell><p style={{ color: 'var(--mawkab-muted)' }}>جارٍ التحميل…</p></Shell>;

  const t = data.totals;
  const show = (v) => fmtCur(v, cur, data.rates);

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

      {/* Account book (profile) selector */}
      <div className="profile-bar">
        <span className="profile-label">الحساب:</span>
        <Dropdown
          value={profile || data.active_profile}
          onChange={changeProfile}
          options={(data.profiles || []).map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>

      {/* Currency toggle for the totals (USD by default) */}
      <div className="cur-toggle">
        {DISPLAY_CURRENCIES.map((c) => (
          <button key={c.value} className={'ct' + (cur === c.value ? ' active' : '')} onClick={() => setCur(c.value)}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="stat-cards acc-cards">
        <div className="stat-card acc-in">
          <div className="sc-value">{show(t.donations_usd)}</div>
          <div className="sc-label">إجمالي التبرعات</div>
        </div>
        <div className="stat-card acc-out">
          <div className="sc-value">{show(t.purchases_usd)}</div>
          <div className="sc-label">إجمالي المشتريات</div>
        </div>
        <div className={'stat-card ' + (t.balance_usd >= 0 ? 'acc-bal' : 'acc-neg')}>
          <div className="sc-value">{show(t.balance_usd)}</div>
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
                <span className="cbd-val">{show(c.usd)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions — one-line summaries; full details on their own page */}
      <div className="acc-toolbar">
        <h2 className="acc-h" style={{ margin: 0 }}>آخر الحركات</h2>
        <Link href="/admin/accounting/transactions" className="btn-ghost">كل الحركات وتفاصيلها ←</Link>
      </div>

      {data.transactions.length === 0 ? (
        <p style={{ color: 'var(--mawkab-muted)' }}>لا توجد حركات بعد.</p>
      ) : (
        <div className="tx-lines">
          {data.transactions.slice(0, 8).map((tx) => (
            <Link key={tx.id} href={`/admin/accounting/tx/${tx.id}`} className="tx-line">
              <span className={'tx-pill ' + (tx.type === 'donation' ? 'tx-in' : 'tx-out')}>
                {tx.type === 'donation' ? 'تبرع' : 'مشترى'}
              </span>
              <span className="tx-line-name">{tx.type === 'purchase' ? (tx.item || '—') : (tx.party || '—')}</span>
              <span className="tx-line-date">{tx.occurred_on}</span>
              <span className="tx-line-usd">{show(tx.amount_usd)}</span>
            </Link>
          ))}
        </div>
      )}

      {modal ? (
        <TransactionModal
          type={modal.type}
          existing={modal.existing}
          categories={data.categories}
          suggestions={data.suggestions}
          profileId={profile || data.active_profile}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(profile); }}
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
          <Autocomplete value={name} onChange={setName} options={categories.map((c) => c.name)}
            placeholder="اسم الفئة (مثال: مواد غذائية)" onEnter={add} wrapStyle={{ flex: 1 }} />
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
