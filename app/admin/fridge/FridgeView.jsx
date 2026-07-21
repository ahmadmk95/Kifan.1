'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import FridgeItemModal from '@/components/FridgeItemModal';
import FridgeCategoriesModal from '@/components/FridgeCategoriesModal';
import { api } from '@/lib/api';
import { fmtQty, isLowStock } from '@/lib/qty';
import { FRIDGE_BRANCHES, BRANCH_LABEL } from '@/lib/fridgeBranches';

export default function FridgeView({ readOnly = false }) {
  const [items, setItems] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [managingCats, setManagingCats] = useState(false);
  const [branch, setBranch] = useState('fridge');

  const load = () => api.fridge()
    .then(({ items, categories, suggestions }) => {
      setItems(items); setCategories(categories || []); setSuggestions(suggestions || {});
    })
    .catch(() => setErr('تعذّر تحميل البيانات'));
  useEffect(() => { load(); }, []);

  const countByBranch = useMemo(() => {
    const m = {};
    for (const it of items || []) { const b = it.location || 'fridge'; m[b] = (m[b] || 0) + 1; }
    return m;
  }, [items]);

  const lowItems = useMemo(() => (items || []).filter(isLowStock), [items]);
  const isLowView = branch === 'low';

  const shown = useMemo(() => {
    if (!items) return [];
    if (isLowView) return lowItems;
    return items.filter((it) => (it.location || 'fridge') === branch);
  }, [items, branch, isLowView, lowItems]);

  const branchLabel = isLowView ? 'النواقص' : (FRIDGE_BRANCHES.find((b) => b.value === branch)?.label || '');

  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>الثلاجة</h1>
          <div className="admin-actions">
            {!readOnly ? <button className="btn-ghost" onClick={() => setManagingCats(true)}>الفئات</button> : null}
            {!readOnly ? <button className="btn-add" onClick={() => setAdding(true)}>＋ إضافة صنف</button> : null}
          </div>
        </div>

        {/* Branch selector + a cross-branch low-stock (النواقص) list */}
        <div className="branch-tabs">
          {FRIDGE_BRANCHES.map((b) => (
            <button key={b.value} className={'branch-tab' + (branch === b.value ? ' active' : '')} onClick={() => setBranch(b.value)}>
              <span className="bt-ico">{b.icon}</span>
              <span className="bt-label">{b.label}</span>
              <span className="bt-count">{countByBranch[b.value] || 0}</span>
            </button>
          ))}
          <button className={'branch-tab low-tab' + (isLowView ? ' active' : '')} onClick={() => setBranch('low')}>
            <span className="bt-ico">⚠️</span>
            <span className="bt-label">النواقص</span>
            <span className="bt-count">{lowItems.length}</span>
          </button>
        </div>

        {err ? (
          <div className="form-msg err">{err}</div>
        ) : items === null ? (
          <p style={{ color: 'var(--mawkab-muted)' }}>جارٍ التحميل…</p>
        ) : shown.length === 0 ? (
          <div className="empty-state">
            <img src="/logo.png" alt="الشعار" />
            <p>{isLowView ? 'لا توجد أصناف ناقصة — المخزون بخير 👍' : `لا توجد أصناف في «${branchLabel}» بعد`}</p>
            {!readOnly && !isLowView ? <button className="btn-add" onClick={() => setAdding(true)}>＋ إضافة صنف</button> : null}
          </div>
        ) : (
          <>
            {isLowView ? (
              <div className="fridge-alert">⚠ {lowItems.length} صنف بحاجة إلى إعادة تعبئة</div>
            ) : null}
            <div className="fridge-grid">
              {shown.map((it) => {
                const low = it.min_qty != null && Number(it.quantity) <= Number(it.min_qty);
                const out = Number(it.quantity) <= 0;
                const flaggedOnly = !low && it.flagged;
                return (
                  <Link key={it.id} href={`/admin/fridge/${it.id}`} className={'fridge-tile' + (out ? ' is-out' : low ? ' is-low' : flaggedOnly ? ' is-flag' : '')}>
                    {it.image_url ? (
                      <span className="ft-img" style={{ backgroundImage: `url(${it.image_url})` }} />
                    ) : (
                      <span className="ft-img ft-img-ph">🧺</span>
                    )}
                    <span className="ft-name">{it.name}</span>
                    {isLowView ? (
                      <span className="ft-cat">{BRANCH_LABEL[it.location] || 'ثلاجة'}</span>
                    ) : it.category_name ? (
                      <span className="ft-cat">{it.category_name}</span>
                    ) : null}
                    <span className="ft-qty">
                      {fmtQty(it.quantity)}{it.unit ? <span className="ft-unit"> {it.unit}</span> : null}
                    </span>
                    {low ? <span className="ft-badge">{out ? 'نفد' : 'منخفض'}</span>
                      : flaggedOnly ? <span className="ft-badge flag">مطلوب</span> : null}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
      <SiteFooter />

      {adding ? (
        <FridgeItemModal
          suggestions={suggestions}
          categories={categories}
          defaultLocation={isLowView ? 'fridge' : branch}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); }}
        />
      ) : null}

      {managingCats ? (
        <FridgeCategoriesModal
          categories={categories}
          onClose={() => setManagingCats(false)}
          onChanged={load}
        />
      ) : null}
    </div>
  );
}
