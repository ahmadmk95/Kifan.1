'use client';

import { useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import RecipeModal from '@/components/RecipeModal';
import { api } from '@/lib/api';
import { fmtQty } from '@/lib/qty';
import { scaleRecipe, round3 } from '@/lib/scale';
import { tap } from '@/lib/haptics';

export default function RecipesView({ readOnly = false }) {
  const [recipes, setRecipes] = useState(null);
  const [err, setErr] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [modal, setModal] = useState(null); // { existing? } | null
  const [target, setTarget] = useState(''); // wanted amount of الثابت

  const load = () => api.recipes()
    .then(({ recipes }) => {
      setRecipes(recipes);
      setOpenId((cur) => cur || (recipes[0] ? recipes[0].id : null));
    })
    .catch(() => setErr('تعذّر تحميل البيانات'));
  useEffect(() => { load(); }, []);

  const recipe = useMemo(
    () => (recipes || []).find((r) => r.id === openId) || null,
    [recipes, openId]
  );
  const base = recipe?.base || null;
  const scaled = useMemo(
    () => scaleRecipe(recipe?.items || [], base?.qty, target),
    [recipe, base, target]
  );

  const remove = async (r) => {
    if (!window.confirm(`حذف طبخة «${r.name}»؟`)) return;
    await api.removeRecipe(r.id);
    if (openId === r.id) setOpenId(null);
    load();
  };

  const shareWhatsApp = () => {
    if (!recipe || !scaled.valid) return;
    const lines = scaled.rows.map((it) => {
      const u = it.unit ? ' ' + it.unit : '';
      const star = it.is_base ? ' ⭐' : '';
      const note = it.rounded ? ` (${fmtQty(round3(it.exact))}${u} بالضبط)` : '';
      return `• ${it.name}: ${fmtQty(it.needed)}${u}${note}${star}`;
    });
    const msg = [
      `👨‍🍳 *${recipe.name}*`,
      'موكب أمير المؤمنين (ع)',
      `على أساس ${fmtQty(Number(target))}${base?.unit ? ' ' + base.unit : ''} من ${base?.name || 'الثابت'}`,
      '',
      ...lines,
    ].join('\n');
    tap();
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>معادلات ووصفات الطبخ</h1>
          <div className="admin-actions">
            {!readOnly ? <button className="btn-add" onClick={() => setModal({})}>＋ طبخة جديدة</button> : null}
          </div>
        </div>

        {err ? (
          <div className="form-msg err">{err}</div>
        ) : recipes === null ? (
          <p style={{ color: 'var(--mawkab-muted)' }}>جارٍ التحميل…</p>
        ) : recipes.length === 0 ? (
          <div className="empty-state">
            <img src="/logo.png" alt="الشعار" />
            <p>لا توجد طبخات بعد</p>
            {!readOnly ? <button className="btn-add" onClick={() => setModal({})}>＋ طبخة جديدة</button> : null}
          </div>
        ) : (
          <>
            {/* Dish picker */}
            <div className="branch-tabs">
              {recipes.map((r) => (
                <button key={r.id} className={'branch-tab' + (openId === r.id ? ' active' : '')} onClick={() => { setOpenId(r.id); tap(); }}>
                  <span className="bt-ico">🍲</span>
                  <span className="bt-label">{r.name}</span>
                  <span className="bt-count">{r.item_count}</span>
                </button>
              ))}
            </div>

            {recipe ? (
              <>
                <div className="acc-toolbar">
                  <h2 className="acc-h" style={{ margin: 0 }}>{recipe.name}</h2>
                  {!readOnly ? (
                    <div className="admin-actions">
                      <button className="btn-small" onClick={() => setModal({ existing: recipe })}>تعديل</button>
                      <button className="btn-danger" onClick={() => remove(recipe)}>حذف</button>
                    </div>
                  ) : null}
                </div>
                {recipe.note ? <p className="acc-note">{recipe.note}</p> : null}

                {!base ? (
                  <div className="form-msg err">لم يُحدَّد الثابت لهذه الطبخة. عدّلها واختر المكوّن الثابت.</div>
                ) : (
                  <>
                    {/* The ask: how much of the anchor ingredient */}
                    <div className="acc-panel calc-panel">
                      <h2 className="acc-h">كم تريد أن تطبخ؟</h2>
                      <div className="calc-ask">
                        <span>أريد</span>
                        <input
                          type="number" inputMode="decimal" dir="ltr" value={target}
                          onChange={(e) => setTarget(e.target.value)}
                          placeholder={fmtQty(base.qty)}
                        />
                        <span>{base.unit || ''} من <b>{base.name}</b></span>
                      </div>
                      <p className="acc-note" style={{ margin: '10px 0 0' }}>
                        المعادلة الأساسية: {fmtQty(base.qty)}{base.unit ? ' ' + base.unit : ''} من {base.name}
                        {scaled.valid ? <> · المضاعف الحالي <b>×{fmtQty(round3(scaled.factor))}</b></> : null}
                      </p>
                    </div>

                    {/* Result */}
                    <div className="acc-toolbar">
                      <h2 className="acc-h" style={{ margin: 0 }}>
                        {scaled.valid ? 'المقادير المطلوبة' : 'المقادير الأساسية'}
                      </h2>
                      {scaled.valid ? (
                        <button type="button" className="wa-share wa-compact" onClick={shareWhatsApp}>
                          <svg viewBox="0 0 32 32" width="17" height="17" aria-hidden="true">
                            <path fill="currentColor" d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.6c1.7.9 3.7 1.4 5.8 1.4h.1c6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.9h-.1c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7.7.7-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.3 0-5.5 4.5-9.9 10-9.9 2.7 0 5.2 1 7 2.9 1.9 1.9 2.9 4.4 2.9 7 0 5.5-4.5 9.9-9.9 9.9zm5.5-7.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.2-.6-.4z"/>
                          </svg>
                          مشاركة عبر واتساب
                        </button>
                      ) : null}
                    </div>

                    <div className="rec-list">
                      {(scaled.valid ? scaled.rows : recipe.items).map((it) => {
                        const shown = scaled.valid ? it.needed : it.qty;
                        return (
                          <div className={'rec-row' + (it.is_base ? ' is-base' : '')} key={it.id}>
                            <span className="rec-name">
                              {it.name}
                              {it.is_base ? <span className="rec-base-tag">الثابت</span> : null}
                            </span>
                            <span className="rec-qty">
                              {fmtQty(shown)}{it.unit ? <span className="rec-unit"> {it.unit}</span> : null}
                              {scaled.valid && it.rounded ? (
                                <span className="rec-exact">({fmtQty(round3(it.exact))} بالضبط)</span>
                              ) : null}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter />

      {modal ? (
        <RecipeModal
          existing={modal.existing}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      ) : null}
    </div>
  );
}
