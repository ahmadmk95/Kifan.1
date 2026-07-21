'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import FridgeItemModal from '@/components/FridgeItemModal';
import FridgeUnitsModal from '@/components/FridgeUnitsModal';
import { api } from '@/lib/api';
import { fmtQty, isLowStock } from '@/lib/qty';
import { FRIDGE_BRANCHES, BRANCH_LABEL } from '@/lib/fridgeBranches';

export default function FridgeView({ readOnly = false }) {
  const [items, setItems] = useState(null);
  const [units, setUnits] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [managingUnits, setManagingUnits] = useState(false);
  const [branch, setBranch] = useState('fridge');

  const load = () => api.fridge()
    .then(({ items, units, suggestions }) => {
      setItems(items); setUnits(units || []); setSuggestions(suggestions || {});
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

  const shareWhatsApp = () => {
    const lines = lowItems.map((it) => {
      const b = BRANCH_LABEL[it.location] || 'ثلاجة';
      const unit = it.unit ? ' ' + it.unit : '';
      const out = Number(it.quantity) <= 0;
      const belowMin = it.min_qty != null && Number(it.quantity) <= Number(it.min_qty);
      let status = '';
      if (out) status = ' (نفد)';
      else if (belowMin) status = ` (الحد ${fmtQty(it.min_qty)}${unit})`;
      return `• ${it.name} — ${b} — ${fmtQty(it.quantity)}${unit}${status}`;
    });
    const today = new Date().toISOString().slice(0, 10);
    const msg = [
      '📋 *قائمة النواقص — ثلاجة الموكب*',
      'موكب أمير المؤمنين (ع)',
      `التاريخ: ${today}`,
      '',
      `⚠ الأصناف الناقصة (${lowItems.length}):`,
      ...lines,
      '',
      'يرجى إعادة التعبئة. 🙏',
    ].join('\n');
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>الثلاجة</h1>
          <div className="admin-actions">
            {!readOnly ? <button className="btn-ghost" onClick={() => setManagingUnits(true)}>الوحدات</button> : null}
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
              <>
                <div className="fridge-alert">⚠ {lowItems.length} صنف بحاجة إلى إعادة تعبئة</div>
                <button type="button" className="wa-share" onClick={shareWhatsApp}>
                  <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">
                    <path fill="currentColor" d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.6c1.7.9 3.7 1.4 5.8 1.4h.1c6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.9h-.1c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7.7.7-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.3 0-5.5 4.5-9.9 10-9.9 2.7 0 5.2 1 7 2.9 1.9 1.9 2.9 4.4 2.9 7 0 5.5-4.5 9.9-9.9 9.9zm5.5-7.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.2-.6-.4z"/>
                  </svg>
                  مشاركة القائمة عبر واتساب
                </button>
              </>
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
                    {isLowView ? <span className="ft-cat">{BRANCH_LABEL[it.location] || 'ثلاجة'}</span> : null}
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
          units={units}
          defaultLocation={isLowView ? 'fridge' : branch}
          onUnitsChanged={load}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); }}
        />
      ) : null}

      {managingUnits ? (
        <FridgeUnitsModal
          units={units}
          onClose={() => setManagingUnits(false)}
          onChanged={load}
        />
      ) : null}
    </div>
  );
}
