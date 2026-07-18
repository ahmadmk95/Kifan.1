'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { api } from '@/lib/api';

const CURRENCIES = ['USD', 'IQD', 'KWD'];
const CUR_LABEL = { USD: 'دولار $', IQD: 'دينار عراقي', KWD: 'دينار كويتي' };

function usd(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function amt(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 3 });
}
const today = () => new Date().toISOString().slice(0, 10);

export default function AccountingView() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [modal, setModal] = useState(null); // 'donation' | 'purchase' | null
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
          <button className="btn-add" onClick={() => setModal('donation')}>＋ تبرع</button>
          <button className="btn-add btn-out" onClick={() => setModal('purchase')}>＋ مشترى</button>
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
        <RatesPanel rates={data.rates} onSaved={load} />
        <CategoriesPanel categories={data.categories} onChanged={load} />
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
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ direction: 'ltr', textAlign: 'right' }}>{tx.occurred_on}</td>
                  <td>
                    <span className={'tx-pill ' + (tx.type === 'donation' ? 'tx-in' : 'tx-out')}>
                      {tx.type === 'donation' ? 'تبرع' : 'مشترى'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{tx.party || '—'}</div>
                    {tx.description ? <div style={{ fontSize: 12.5, color: 'var(--mawkab-muted)' }}>{tx.description}</div> : null}
                  </td>
                  <td>{tx.category_name || (tx.type === 'purchase' ? 'غير مصنّف' : '—')}</td>
                  <td>{amt(tx.amount)} <span style={{ color: 'var(--mawkab-muted)', fontSize: 12 }}>{tx.currency}</span></td>
                  <td style={{ fontWeight: 700 }}>{usd(tx.amount_usd)}</td>
                  <td>
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
                  <td>
                    <button
                      className="btn-danger"
                      onClick={async () => {
                        if (window.confirm('حذف هذه الحركة؟')) { await api.removeTransaction(tx.id); load(); }
                      }}
                    >حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <TransactionModal
          type={modal}
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

function RatesPanel({ rates, onSaved }) {
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
        <input type="number" inputMode="decimal" value={iqd} onChange={(e) => setIqd(e.target.value)} dir="ltr" />
        <span>دينار عراقي</span>
      </div>
      <div className="rate-row">
        <label>$100 =</label>
        <input type="number" inputMode="decimal" value={kwd} onChange={(e) => setKwd(e.target.value)} dir="ltr" />
        <span>دينار كويتي</span>
      </div>
      <button className="btn-add" onClick={save} disabled={busy} style={{ marginTop: 6 }}>حفظ الأسعار</button>
      {msg ? <div className="acc-inline-msg">{msg}</div> : null}
    </div>
  );
}

function CategoriesPanel({ categories, onChanged }) {
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
      <div className="rate-row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الفئة (مثال: مواد غذائية)"
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }} style={{ flex: 1 }} />
        <button className="btn-add" onClick={add} disabled={busy}>＋</button>
      </div>
      <div className="cat-chips">
        {categories.length === 0 ? <span style={{ color: 'var(--mawkab-muted)', fontSize: 13 }}>لا توجد فئات بعد</span> : null}
        {categories.map((c) => (
          <span key={c.id} className="cat-chip">
            {c.name}
            <button onClick={async () => { if (window.confirm('حذف فئة «' + c.name + '»؟')) { await api.removeCategory(c.id); onChanged(); } }}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function TransactionModal({ type, categories, onClose, onSaved }) {
  const isPurchase = type === 'purchase';
  const [f, setF] = useState({
    amount: '',
    currency: isPurchase ? 'IQD' : 'USD',
    category_id: '',
    party: '',
    description: '',
    occurred_on: today(),
  });
  const [images, setImages] = useState([]); // {url}
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true); setErr(null);
    try {
      for (const file of files) {
        const { url } = await api.uploadImage(file);
        setImages((prev) => [...prev, { url }]);
      }
    } catch (ex) {
      setErr(ex.message || 'تعذّر رفع الصورة');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async () => {
    if (busy) return;
    if (!(Number(f.amount) > 0)) { setErr('أدخل مبلغاً صحيحاً'); return; }
    setBusy(true); setErr(null);
    try {
      await api.addTransaction({
        type,
        amount: Number(f.amount),
        currency: f.currency,
        category_id: isPurchase ? (f.category_id || null) : null,
        party: f.party.trim(),
        description: f.description.trim(),
        occurred_on: f.occurred_on,
        images: images.map((i) => i.url),
      });
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal2" onClick={(e) => e.stopPropagation()}>
        <div className="modal2-head">
          <h3>{isPurchase ? 'إضافة مشترى' : 'إضافة تبرع'}</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal2-body">
          {err ? <div className="form-msg err">{err}</div> : null}
          <div className="form-row">
            <div className="form-field">
              <label>المبلغ</label>
              <input type="number" inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value)} dir="ltr" autoFocus />
            </div>
            <div className="form-field" style={{ maxWidth: 170 }}>
              <label>العملة</label>
              <select value={f.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{CUR_LABEL[c]}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>{isPurchase ? 'المورّد / الجهة (اختياري)' : 'المتبرّع (اختياري)'}</label>
              <input value={f.party} onChange={(e) => set('party', e.target.value)} />
            </div>
            <div className="form-field" style={{ maxWidth: 170 }}>
              <label>التاريخ</label>
              <input type="date" value={f.occurred_on} onChange={(e) => set('occurred_on', e.target.value)} dir="ltr" />
            </div>
          </div>

          {isPurchase ? (
            <div className="form-field">
              <label>الفئة</label>
              <select value={f.category_id} onChange={(e) => set('category_id', e.target.value)}>
                <option value="">— بدون فئة —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : null}

          <div className="form-field">
            <label>ملاحظة / بيان (اختياري)</label>
            <input value={f.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          {isPurchase ? (
            <div className="form-field">
              <label>صور الفواتير (اختياري — يمكن إضافة أكثر من صورة)</label>
              <input type="file" accept="image/*" multiple onChange={onFiles} />
              {uploading ? <div className="acc-inline-msg">جارٍ الرفع…</div> : null}
              {images.length ? (
                <div className="inv-thumbs" style={{ marginTop: 8 }}>
                  {images.map((im, i) => (
                    <span key={i} className="inv-thumb-wrap">
                      <img src={im.url} alt="فاتورة" />
                      <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}>×</button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="admin-actions" style={{ marginTop: 8 }}>
            <button className="btn-add" onClick={submit} disabled={busy || uploading}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}
