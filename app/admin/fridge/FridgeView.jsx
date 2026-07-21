'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import FridgeItemModal from '@/components/FridgeItemModal';
import { api } from '@/lib/api';
import { fmtQty } from '@/lib/qty';
import { FRIDGE_BRANCHES } from '@/lib/fridgeBranches';

export default function FridgeView({ readOnly = false }) {
  const [items, setItems] = useState(null);
  const [suggestions, setSuggestions] = useState({});
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [branch, setBranch] = useState('fridge');

  const load = () => api.fridge()
    .then(({ items, suggestions }) => { setItems(items); setSuggestions(suggestions || {}); })
    .catch(() => setErr('تعذّر تحميل البيانات'));
  useEffect(() => { load(); }, []);

  const countByBranch = useMemo(() => {
    const m = {};
    for (const it of items || []) { const b = it.location || 'fridge'; m[b] = (m[b] || 0) + 1; }
    return m;
  }, [items]);

  const branchItems = useMemo(
    () => (items || []).filter((it) => (it.location || 'fridge') === branch),
    [items, branch]
  );
  const lowCount = branchItems.filter((it) => it.min_qty != null && Number(it.quantity) <= Number(it.min_qty)).length;
  const branchLabel = FRIDGE_BRANCHES.find((b) => b.value === branch)?.label || '';

  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>الثلاجة</h1>
          <div className="admin-actions">
            {!readOnly ? <button className="btn-add" onClick={() => setAdding(true)}>＋ إضافة صنف</button> : null}
          </div>
        </div>

        {/* Branch selector — same inventory model per branch */}
        <div className="branch-tabs">
          {FRIDGE_BRANCHES.map((b) => (
            <button key={b.value} className={'branch-tab' + (branch === b.value ? ' active' : '')} onClick={() => setBranch(b.value)}>
              <span className="bt-ico">{b.icon}</span>
              <span className="bt-label">{b.label}</span>
              <span className="bt-count">{countByBranch[b.value] || 0}</span>
            </button>
          ))}
        </div>

        {err ? (
          <div className="form-msg err">{err}</div>
        ) : items === null ? (
          <p style={{ color: 'var(--mawkab-muted)' }}>جارٍ التحميل…</p>
        ) : branchItems.length === 0 ? (
          <div className="empty-state">
            <img src="/logo.png" alt="الشعار" />
            <p>لا توجد أصناف في «{branchLabel}» بعد</p>
            {!readOnly ? <button className="btn-add" onClick={() => setAdding(true)}>＋ إضافة صنف</button> : null}
          </div>
        ) : (
          <>
            {lowCount > 0 ? (
              <div className="fridge-alert">⚠ {lowCount} صنف بحاجة إلى إعادة تعبئة في «{branchLabel}»</div>
            ) : null}
            <div className="fridge-grid">
              {branchItems.map((it) => {
                const low = it.min_qty != null && Number(it.quantity) <= Number(it.min_qty);
                const out = Number(it.quantity) <= 0;
                return (
                  <Link key={it.id} href={`/admin/fridge/${it.id}`} className={'fridge-tile' + (out ? ' is-out' : low ? ' is-low' : '')}>
                    {it.image_url ? (
                      <span className="ft-img" style={{ backgroundImage: `url(${it.image_url})` }} />
                    ) : (
                      <span className="ft-img ft-img-ph">🧺</span>
                    )}
                    <span className="ft-name">{it.name}</span>
                    <span className="ft-qty">
                      {fmtQty(it.quantity)}{it.unit ? <span className="ft-unit"> {it.unit}</span> : null}
                    </span>
                    {low ? <span className="ft-badge">{out ? 'نفد' : 'منخفض'}</span> : null}
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
          defaultLocation={branch}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); }}
        />
      ) : null}
    </div>
  );
}
