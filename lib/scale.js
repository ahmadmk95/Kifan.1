// Pure recipe scaling — safe to import from client components (no DB).

// How much of everything is needed for `targetBaseQty` of the anchor ingredient.
// Returns { factor, rows } where each row carries the exact amount and, for
// ingredients that only come in whole units (ذبيحة / علبة / كيس), the amount
// rounded up to the next whole one.
export function scaleRecipe(items, baseQty, targetBaseQty) {
  const base = Number(baseQty);
  const target = Number(targetBaseQty);
  const valid = Number.isFinite(base) && base > 0 && Number.isFinite(target) && target > 0;
  const factor = valid ? target / base : 0;
  const rows = (items || []).map((it) => {
    const exact = (Number(it.qty) || 0) * factor;
    return {
      ...it,
      exact,
      // Whole-unit ingredients round UP: you can't buy 4.875 ذبيحة.
      needed: it.whole ? Math.ceil(round3(exact)) : round3(exact),
      rounded: !!it.whole && Math.ceil(round3(exact)) !== round3(exact),
    };
  });
  return { factor, rows, valid };
}

// Trim floating-point noise (1.6250000000000002 → 1.625).
export function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}
