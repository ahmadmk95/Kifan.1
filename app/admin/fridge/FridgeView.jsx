'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import FridgeItemModal from '@/components/FridgeItemModal';
import FridgeUnitsModal from '@/components/FridgeUnitsModal';
import { api } from '@/lib/api';
import { fmtQty, isLowStock } from '@/lib/qty';
import { today } from '@/lib/money';
import { tap } from '@/lib/haptics';
import { normalizeText } from '@/lib/normalize';
import { FRIDGE_BRANCHES, BRANCH_LABEL } from '@/lib/fridgeBranches';

// The two inventory sections, so a search can span both and label each result.
const STORE_META = {
  fridge: { title: 'الثلاجة', basePath: '/admin/fridge', branched: true },
  dargeel: { title: 'دار الجيل', basePath: '/admin/dargeel', branched: false },
};

export default function FridgeView({
  readOnly = false,
  store = 'fridge',
  title = 'الثلاجة',
  branches = FRIDGE_BRANCHES,
  basePath = '/admin/fridge',
}) {
  const hasBranches = branches.length > 0;
  const [items, setItems] = useState(null);
  const [units, setUnits] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [managingUnits, setManagingUnits] = useState(false);
  const [branch, setBranch] = useState(hasBranches ? branches[0].value : 'all');
  const [query, setQuery] = useState('');
  const otherStore = store === 'fridge' ? 'dargeel' : 'fridge';
  const [otherItems, setOtherItems] = useState([]);

  const load = () => api.fridge(store)
    .then(({ items, units, suggestions }) => {
      setItems(items); setUnits(units || []); setSuggestions(suggestions || {});
    })
    .catch(() => setErr('تعذّر تحميل البيانات'));
  useEffect(() => { load(); }, []);
  // Also load the other section's items so a search can find things there too.
  useEffect(() => {
    api.fridge(otherStore).then(({ items }) => setOtherItems(items || [])).catch(() => {});
  }, [otherStore]);

  const countByBranch = useMemo(() => {
    const m = {};
    for (const it of items || []) { const b = it.location || 'fridge'; m[b] = (m[b] || 0) + 1; }
    return m;
  }, [items]);

  const lowItems = useMemo(() => (items || []).filter(isLowStock), [items]);
  const isLowView = branch === 'low';
  const q = normalizeText(query.trim());
  const searching = q.length > 0;

  const shown = useMemo(() => {
    if (!items) return [];
    // A search spans BOTH sections (الثلاجة + دار الجيل) and all their branches.
    if (searching) {
      const pool = [...items, ...otherItems];
      const match = (it) => normalizeText(it.name).includes(q) || normalizeText(it.note || '').includes(q);
      return pool.filter(match);
    }
    if (isLowView) return lowItems;
    if (branch === 'all') return items;
    return items.filter((it) => (it.location || 'fridge') === branch);
  }, [items, branch, isLowView, lowItems, searching, q, otherItems]);

  // Which section (and branch) an item belongs to, and its detail link.
  const itemStore = (it) => STORE_META[it.store] ? it.store : store;
  const itemLink = (it) => `${STORE_META[itemStore(it)].basePath}/${it.id}`;
  const sectionLabel = (it) => {
    const meta = STORE_META[itemStore(it)];
    if (meta.branched) return `${meta.title} · ${BRANCH_LABEL[it.location] || 'ثلاجة'}`;
    return meta.title;
  };

  // Tabs: the fridge's branches, or a single "الأصناف" tab for a one-branch store.
  const tabs = hasBranches ? branches : [{ value: 'all', label: 'الأصناف', icon: '📦' }];
  const currentTab = tabs.find((tb) => tb.value === branch);
  const viewLabel = isLowView ? 'النواقص' : (currentTab?.label || 'الأصناف');

  // Swipe left/right on the grid to move between tabs (النواقص included).
  const tabOrder = [...tabs.map((tb) => tb.value), 'low'];
  const goRelTab = (dir) => {
    const i = tabOrder.indexOf(branch);
    const ni = Math.min(Math.max(i + dir, 0), tabOrder.length - 1);
    if (ni !== i) { setBranch(tabOrder[ni]); tap(); }
  };

  // Share the full inventory (current stock for every item) over WhatsApp.
  const shareStock = () => {
    const all = items || [];
    const fmtLine = (it) => {
      const unit = it.unit ? ' ' + it.unit : '';
      const out = Number(it.quantity) <= 0;
      const belowMin = it.min_qty != null && Number(it.quantity) <= Number(it.min_qty);
      const status = out ? ' (نفد)' : belowMin ? ' (منخفض)' : '';
      return `• ${it.name} — ${fmtQty(it.quantity)}${unit}${status}`;
    };
    const body = [];
    if (hasBranches) {
      for (const b of branches) {
        const list = all.filter((it) => (it.location || 'fridge') === b.value);
        if (!list.length) continue;
        body.push(`${b.icon || ''} *${b.label}* (${list.length}):`);
        body.push(...list.map(fmtLine));
        body.push('');
      }
    } else {
      body.push(...all.map(fmtLine));
      body.push('');
    }
    const msg = [
      `📋 *جرد المخزون — ${title}*`,
      'موكب أمير المؤمنين (ع)',
      `التاريخ: ${today()}`,
      `إجمالي الأصناف: ${all.length}`,
      '',
      ...body,
    ].join('\n').trimEnd();
    tap();
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  const shareWhatsApp = () => {
    const lines = lowItems.map((it) => {
      const b = hasBranches ? ` — ${BRANCH_LABEL[it.location] || 'ثلاجة'}` : '';
      const unit = it.unit ? ' ' + it.unit : '';
      const out = Number(it.quantity) <= 0;
      const belowMin = it.min_qty != null && Number(it.quantity) <= Number(it.min_qty);
      let status = '';
      if (out) status = ' (نفد)';
      else if (belowMin) status = ` (الحد ${fmtQty(it.min_qty)}${unit})`;
      return `• ${it.name}${b} — ${fmtQty(it.quantity)}${unit}${status}`;
    });
    const msg = [
      `📋 *قائمة النواقص — ${title}*`,
      'موكب أمير المؤمنين (ع)',
      `التاريخ: ${today()}`,
      '',
      `⚠ الأصناف الناقصة (${lowItems.length}):`,
      ...lines,
      '',
      'يرجى إعادة التعبئة. 🙏',
    ].join('\n');
    tap();
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>{title}</h1>
          <div className="admin-actions">
            <button type="button" className="wa-share wa-compact" onClick={shareStock} disabled={!(items && items.length)} title="مشاركة الجرد عبر واتساب">
              <svg viewBox="0 0 32 32" width="17" height="17" aria-hidden="true">
                <path fill="currentColor" d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.6c1.7.9 3.7 1.4 5.8 1.4h.1c6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.9h-.1c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7.7.7-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.3 0-5.5 4.5-9.9 10-9.9 2.7 0 5.2 1 7 2.9 1.9 1.9 2.9 4.4 2.9 7 0 5.5-4.5 9.9-9.9 9.9zm5.5-7.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.2-.6-.4z"/>
              </svg>
              مشاركة الجرد
            </button>
            {!readOnly ? <button className="btn-ghost" onClick={() => setManagingUnits(true)}>الوحدات</button> : null}
            {!readOnly ? <button className="btn-add" onClick={() => setAdding(true)}>＋ إضافة صنف</button> : null}
          </div>
        </div>

        {/* Search across all items of this store (by name or note) */}
        <div className="search-box fridge-search">
          <div className="search-inputwrap">
            <svg className="search-ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في الثلاجة ودار الجيل…"
              aria-label="بحث عن صنف"
            />
            {query ? <button className="search-clear" onClick={() => setQuery('')} aria-label="مسح">×</button> : null}
          </div>
        </div>

        {/* Section tabs + the low-stock (النواقص) list */}
        <div className="branch-tabs" style={searching ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
          {tabs.map((b) => (
            <button key={b.value} className={'branch-tab' + (branch === b.value ? ' active' : '')} onClick={() => setBranch(b.value)}>
              <span className="bt-ico">{b.icon}</span>
              <span className="bt-label">{b.label}</span>
              <span className="bt-count">{b.value === 'all' ? (items || []).length : (countByBranch[b.value] || 0)}</span>
            </button>
          ))}
          <button className={'branch-tab low-tab' + (isLowView ? ' active' : '')} onClick={() => setBranch('low')}>
            <span className="bt-ico">⚠️</span>
            <span className="bt-label">النواقص</span>
            <span className="bt-count">{lowItems.length}</span>
          </button>
        </div>
        {!searching ? <div className="swipe-hint">↔ اسحب القائمة للتنقّل بين الأقسام</div> : null}

        {err ? (
          <div className="form-msg err">{err}</div>
        ) : items === null ? (
          <p style={{ color: 'var(--mawkab-muted)' }}>جارٍ التحميل…</p>
        ) : shown.length === 0 ? (
          <div className="empty-state">
            <img src="/logo.png" alt="الشعار" />
            <p>{searching ? `لا نتائج لـ «${query.trim()}»` : isLowView ? 'لا توجد أصناف ناقصة — المخزون بخير 👍' : `لا توجد أصناف في «${viewLabel}» بعد`}</p>
            {!readOnly && !isLowView && !searching ? <button className="btn-add" onClick={() => setAdding(true)}>＋ إضافة صنف</button> : null}
          </div>
        ) : (
          <>
            {searching ? (
              <div className="fridge-alert search-count">نتائج البحث: {shown.length}</div>
            ) : null}
            {isLowView && !searching ? (
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
            <motion.div
              className="fridge-grid"
              key={isLowView ? 'low' : branch}
              drag={searching ? false : 'x'}
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.14}
              onDragEnd={(e, info) => {
                if (info.offset.x < -64 || info.velocity.x < -450) goRelTab(1);
                else if (info.offset.x > 64 || info.velocity.x > 450) goRelTab(-1);
              }}
            >
              {shown.map((it) => {
                const low = it.min_qty != null && Number(it.quantity) <= Number(it.min_qty);
                const out = Number(it.quantity) <= 0;
                const flaggedOnly = !low && it.flagged;
                return (
                  <Link key={it.store + it.id} href={searching ? itemLink(it) : `${basePath}/${it.id}`} className={'fridge-tile' + (out ? ' is-out' : low ? ' is-low' : flaggedOnly ? ' is-flag' : '')}>
                    {it.image_url ? (
                      <span className="ft-img" style={{ backgroundImage: `url(${it.image_url})` }} />
                    ) : (
                      <span className="ft-img ft-img-ph">🧺</span>
                    )}
                    <span className="ft-name">{it.name}</span>
                    {searching ? <span className="ft-cat">{sectionLabel(it)}</span>
                      : isLowView && hasBranches ? <span className="ft-cat">{BRANCH_LABEL[it.location] || 'ثلاجة'}</span> : null}
                    <span className="ft-qty">
                      {fmtQty(it.quantity)}{it.unit ? <span className="ft-unit"> {it.unit}</span> : null}
                    </span>
                    {low ? <span className="ft-badge">{out ? 'نفد' : 'منخفض'}</span>
                      : flaggedOnly ? <span className="ft-badge flag">مطلوب</span> : null}
                  </Link>
                );
              })}
            </motion.div>
          </>
        )}
      </main>
      <SiteFooter />

      {adding ? (
        <FridgeItemModal
          store={store}
          showBranches={hasBranches}
          branches={branches}
          suggestions={suggestions}
          units={units}
          defaultLocation={hasBranches ? (branch === 'low' || branch === 'all' ? branches[0].value : branch) : 'main'}
          onUnitsChanged={load}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); }}
        />
      ) : null}

      {managingUnits ? (
        <FridgeUnitsModal
          store={store}
          units={units}
          onClose={() => setManagingUnits(false)}
          onChanged={load}
        />
      ) : null}
    </div>
  );
}
