'use client';

import { useMemo, useState } from 'react';
import { MEALS, STATUS, dayLabel } from '@/lib/plan/model';

// Loose Arabic matching: ignores diacritics, hamza forms, ة/ه, ى/ي and spaces.
export function normText(s) {
  return String(s ?? '')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function matches(q, ...values) {
  const n = normText(q);
  if (!n) return true;
  return values.some((v) => normText(v).includes(n));
}

export const EMPTY_FILTERS = { q: '', day: '', meal: '', cook: '', status: '' };

export function useFilters(initial = {}) {
  const blank = { ...EMPTY_FILTERS, ...Object.fromEntries(Object.keys(initial).map((k) => [k, ''])) };
  const [f, setF] = useState({ ...blank, ...initial });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const reset = () => setF(blank);
  const active = Object.values(f).some(Boolean);
  return { f, set, reset, active };
}

// Row predicates for the feeding plan, from the filter state.
export function dayFilter(f) {
  const active = !!(f.q || f.meal || f.cook || f.status);
  return {
    active,
    item: (it) =>
      (!f.meal || it.meal === f.meal) &&
      (!f.cook || (it.cook || '').trim() === f.cook) &&
      (!f.status || (it.status || 'pending') === f.status) &&
      matches(f.q, it.item, it.qty, it.method, it.cook, it.notes),
    note: (n) => !f.meal && !f.cook && (!f.status || (n.status || 'pending') === f.status) && matches(f.q, n.text, n.owner),
    external: (x) => !f.cook && (!f.status || (x.status || 'pending') === f.status) && matches(f.q, x.meal, x.main_qty, x.rice_qty, x.notes),
  };
}

// Days that still have something to show under the filters.
export function filterDays(days, f) {
  const pred = dayFilter(f);
  return days
    .filter((d) => !f.day || d.id === f.day)
    .filter((d) => !pred.active || d.items.some(pred.item) || d.notes.some(pred.note) || d.external.some(pred.external) || (f.q && matches(f.q, d.title, d.hijri)));
}

export function FilterBar({ filters, days = [], cooks = [], show = ['q', 'day', 'meal', 'cook', 'status'], placeholder = 'بحث…', children }) {
  const { f, set, reset, active } = filters;
  return (
    <div className="pl-filters" role="search">
      {show.includes('q') ? (
        <input className="pl-search" type="search" value={f.q} onChange={(e) => set('q', e.target.value)} placeholder={placeholder} aria-label="بحث" />
      ) : null}
      {show.includes('day') ? (
        <select value={f.day} onChange={(e) => set('day', e.target.value)} aria-label="اليوم">
          <option value="">كل الأيام</option>
          {days.map((d) => <option key={d.id} value={d.id}>{dayLabel(d)}</option>)}
        </select>
      ) : null}
      {show.includes('meal') ? (
        <select value={f.meal} onChange={(e) => set('meal', e.target.value)} aria-label="الوجبة">
          <option value="">كل الوجبات</option>
          {MEALS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
        </select>
      ) : null}
      {show.includes('cook') ? (
        <select value={f.cook} onChange={(e) => set('cook', e.target.value)} aria-label="الطباخ">
          <option value="">كل الطباخين</option>
          {cooks.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      ) : null}
      {show.includes('status') ? (
        <select value={f.status} onChange={(e) => set('status', e.target.value)} aria-label="الحالة">
          <option value="">كل الحالات</option>
          {STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
      ) : null}
      {children}
      {active ? <button type="button" className="pl-btn sm ghost" onClick={reset}>مسح الفلاتر</button> : null}
    </div>
  );
}

export function useCooks(days) {
  return useMemo(() => {
    const s = new Set();
    for (const d of days) for (const it of d.items) if ((it.cook || '').trim()) s.add(it.cook.trim());
    return [...s].sort((a, b) => a.localeCompare(b, 'ar'));
  }, [days]);
}
