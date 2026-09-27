'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  APPETIZER_CATEGORIES, CATEGORIES, CATEGORY_LABEL, MEAL_LABEL, MEALS, SUPPLY_LISTS, dayLabel, formatDate,
} from '@/lib/plan/model';
import { usePlan } from './PlanShell';
import { DayBlock } from './Days';
import { PlanTable, AddButton, StatusBadge } from './Table';
import { FilterBar, useFilters, useCooks, filterDays, dayFilter, matches } from './Filters';
import { TasksSection, FruitMaster, FruitBatches, VegBatches, SuppliesSection } from './Sections';

function EmptyPlan() {
  const { isAdmin } = usePlan();
  return (
    <div className="pl-alert warn">
      لم يتم تحميل بيانات الخطة بعد.
      {isAdmin ? <> <Link href="/plan/backups#import">استيراد ملف Excel ←</Link></> : ' سيقوم المدير باستيرادها قريباً.'}
    </div>
  );
}

function PageHead({ title, sub, children }) {
  return (
    <div className="pl-pagehead">
      <div>
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {children ? <div className="pl-pagehead-tools">{children}</div> : null}
    </div>
  );
}

// ------------------------------------------------------------------ master

export function MasterView({ plan }) {
  const { canEdit, user } = usePlan();
  const filters = useFilters();
  const { f } = filters;
  const cooks = useCooks(plan.days);
  const days = filterDays(plan.days, f);
  const pred = dayFilter(f);
  const onlyDays = !!(f.day || f.meal || f.cook);
  const empty = !plan.days.length && !plan.tasks.length && !plan.supplies.length;

  return (
    <>
      <PageHead title="الجدول الكامل" sub={canEdit ? 'كل البيانات في مكان واحد — اضغط على أي خانة لتعديلها. كل تعديل يظهر فوراً في جميع الصفحات.' : 'كل بيانات الخطة. التعديل متاح للمخوّلين بعد تسجيل الدخول.'}>
        {!user ? <Link href="/login?next=/plan/master" className="pl-btn">دخول للتعديل</Link> : null}
      </PageHead>
      {empty ? <EmptyPlan /> : null}
      <nav className="pl-jump">
        <a href="#tasks">سجل الملاحظات والمهام</a>
        <a href="#days">جدول تغذية الخدام</a>
        <a href="#fruit">طلبات الفواكه</a>
        <a href="#veg">الخضروات</a>
        <a href="#supplies">المستلزمات والمشتريات</a>
      </nav>
      <FilterBar filters={filters} days={plan.days} cooks={cooks} placeholder="بحث في كل الجداول…" />

      {!onlyDays ? (
        <section className="pl-section" id="tasks">
          <h2 className="pl-h2">سجل الملاحظات والمهام</h2>
          <TasksSection tasks={plan.tasks} editable={canEdit} f={f} />
        </section>
      ) : null}

      <section className="pl-section" id="days">
        <h2 className="pl-h2">جدول تغذية الخدام <small>({plan.days.length} يوم)</small></h2>
        {days.map((d) => (
          <DayBlock key={d.id} day={d} editable={canEdit} filter={pred.active ? pred : null} open={days.length <= 3 || !!pred.active || !!f.day} />
        ))}
        {!days.length ? <p className="pl-muted">لا توجد نتائج مطابقة.</p> : null}
        {canEdit ? <AddButton entity="day" defaults={{ day_no: (plan.days.at(-1)?.day_no || 0) + 1, headcount: plan.days.at(-1)?.headcount || null }}>يوم جديد</AddButton> : null}
      </section>

      {!onlyDays ? (
        <>
          <section className="pl-section" id="fruit">
            <h2 className="pl-h2">جدول طلبات الفواكه</h2>
            <FruitMaster fruit={plan.fruit} editable={canEdit} f={f} />
          </section>
          <section className="pl-section" id="veg">
            <h2 className="pl-h2">الخضروات</h2>
            <VegBatches veg={plan.veg} editable={canEdit} f={f} />
          </section>
          <section className="pl-section" id="supplies">
            <h2 className="pl-h2">المستلزمات والمشتريات</h2>
            <SuppliesSection supplies={plan.supplies} editable={canEdit} f={f} />
          </section>
        </>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------ branches (read-only)

export function TasksView({ plan }) {
  const filters = useFilters();
  return (
    <>
      <PageHead title="الخطة — سجل الملاحظات والمهام" sub={`${plan.tasks.length} ملاحظة / مهمة`} />
      <FilterBar filters={filters} show={['q', 'status']} placeholder="بحث في المهام…" />
      <TasksSection tasks={plan.tasks} editable={false} f={filters.f} />
    </>
  );
}

export function InternalView({ plan }) {
  const filters = useFilters();
  const cooks = useCooks(plan.days);
  const days = filterDays(plan.days, filters.f);
  const pred = dayFilter(filters.f);
  return (
    <>
      <PageHead title="الجدول الداخلي — جدول تغذية الخدام" sub="الوجبات اليومية مع ملاحظات التجهيز والطبّاخين." />
      {!plan.days.length ? <EmptyPlan /> : null}
      <FilterBar filters={filters} days={plan.days} cooks={cooks} placeholder="بحث عن صنف، طباخ، ملاحظة…" />
      {days.map((d) => (
        <DayBlock key={d.id} day={d} editable={false} filter={pred.active ? pred : null} showExternal={false} open={days.length <= 3 || pred.active || !!filters.f.day} />
      ))}
      {plan.days.length && !days.length ? <p className="pl-muted">لا توجد نتائج مطابقة.</p> : null}
    </>
  );
}

export function ExternalView({ plan }) {
  const filters = useFilters();
  const { f } = filters;
  const rows = plan.days.flatMap((d) => d.external.map((x) => ({ ...x, _day: d })))
    .filter((x) => (!f.day || x._day.id === f.day) && (!f.status || x.status === f.status) && matches(f.q, x.meal, x.main_qty, x.rice_qty, x.notes));
  return (
    <>
      <PageHead title="جدول الموكب الخارجي" sub="التوزيع الخارجي لكل الأيام في جدول واحد." />
      <FilterBar filters={filters} days={plan.days} show={['q', 'day', 'status']} placeholder="بحث في التوزيع الخارجي…" />
      <PlanTable
        entity="external"
        rows={rows}
        lead={[
          { label: 'التاريخ الميلادي', w: 90, render: (x) => formatDate(x._day.gregorian) },
          { label: 'التاريخ الهجري', w: 80, render: (x) => x._day.hijri },
        ]}
        editable={false}
        empty="لا يوجد توزيع خارجي"
      />
    </>
  );
}

export function AppetizersView({ plan }) {
  const filters = useFilters({ category: '' });
  const { f, set } = filters;
  const rows = useMemo(
    () => plan.days.flatMap((d) => d.items.filter((it) => APPETIZER_CATEGORIES.includes(it.category)).map((it) => ({ ...it, _day: d }))),
    [plan.days]
  ).filter((it) => (!f.day || it._day.id === f.day) && (!f.meal || it.meal === f.meal) && (!f.category || it.category === f.category) && matches(f.q, it.item, it.qty, it.method, it.notes));
  return (
    <>
      <PageHead title="جدول المقبلات والسلطة والحلو" sub="مأخوذ تلقائياً من أصناف الوجبات المصنّفة «مقبلات وسلطات وشوربات» أو «الحلو والفاكهة» في الجدول الكامل." />
      <FilterBar filters={filters} days={plan.days} show={['q', 'day', 'meal']} placeholder="بحث في المقبلات والحلو…">
        <select value={f.category} onChange={(e) => set('category', e.target.value)} aria-label="التصنيف">
          <option value="">كل التصنيفات</option>
          {CATEGORIES.filter((c) => APPETIZER_CATEGORIES.includes(c.v)).map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
        </select>
      </FilterBar>
      <PlanTable
        entity="meal_item"
        rows={rows}
        cols={['item', 'qty', 'notes', 'status']}
        lead={[
          { label: 'اليوم', w: 110, render: (it) => dayLabel(it._day) },
          { label: 'الوجبة', w: 70, render: (it) => MEAL_LABEL[it.meal] },
          { label: 'التصنيف', w: 130, render: (it) => CATEGORY_LABEL[it.category] },
        ]}
        editable={false}
        empty="لا توجد أصناف مطابقة"
      />
    </>
  );
}

export function ProduceView({ plan }) {
  const filters = useFilters();
  return (
    <>
      <PageHead title="الفواكه والخضروات" sub="طلبات الفواكه والخضروات على 3 دفعات." />
      <FilterBar filters={filters} show={['q']} placeholder="بحث عن صنف…" />
      <section className="pl-section">
        <h2 className="pl-h2">جدول طلبات الفواكه</h2>
        <p className="pl-hint">الفواكه التي تتحمّل تُطلب دفعة واحدة، والتي تخترب تُقسم على 3 دفعات.</p>
        <FruitBatches fruit={plan.fruit} f={filters.f} />
      </section>
      <section className="pl-section">
        <h2 className="pl-h2">الخضروات</h2>
        <VegBatches veg={plan.veg} editable={false} f={filters.f} />
      </section>
    </>
  );
}

export function SuppliesView({ plan }) {
  const filters = useFilters({ list: '' });
  const { f, set } = filters;
  const toBuy = plan.supplies.filter((r) => r.status === 'pending').length;
  return (
    <>
      <PageHead title="المستلزمات والمشتريات" sub={`${plan.supplies.length} صنف — ${toBuy} بانتظار الشراء`} />
      <FilterBar filters={filters} show={['q', 'status']} placeholder="بحث عن صنف أو مورد…">
        <select value={f.list} onChange={(e) => set('list', e.target.value)} aria-label="القائمة">
          <option value="">كل القوائم</option>
          {SUPPLY_LISTS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
        </select>
      </FilterBar>
      <nav className="pl-jump">
        {SUPPLY_LISTS.map((l) => <a key={l.v} href={`#list-${l.v}`}>{l.label}</a>)}
      </nav>
      <SuppliesSection supplies={plan.supplies} editable={false} f={f} />
    </>
  );
}

// ------------------------------------------------------------------ print view

export function DayPrint({ day, prev, next, days }) {
  return (
    <div className="pl-print">
      <div className="pl-print-tools no-print">
        {prev ? <Link href={`/plan/day/${prev.id}`} className="pl-btn sm ghost">→ {dayLabel(prev)}</Link> : <span />}
        <select value={day.id} onChange={(e) => { window.location.href = `/plan/day/${e.target.value}`; }} aria-label="اختر اليوم">
          {days.map((d) => <option key={d.id} value={d.id}>{dayLabel(d)}</option>)}
        </select>
        <button type="button" className="pl-btn sm" onClick={() => window.print()}>🖨 طباعة</button>
        {next ? <Link href={`/plan/day/${next.id}`} className="pl-btn sm ghost">{dayLabel(next)} ←</Link> : <span />}
      </div>
      <header className="pl-print-head">
        <h1>جدول تغذية الخدام — اليوم {day.hijri}</h1>
        <div className="pl-print-meta">
          {day.gregorian ? <span>التاريخ: {formatDate(day.gregorian)}</span> : null}
          <span>اليوم رقم ({day.day_no})</span>
          {day.headcount ? <span>العدد: {day.headcount} شخص</span> : null}
        </div>
        {day.title ? <p className="pl-print-note">{day.title}</p> : null}
      </header>
      {MEALS.map((m) => {
        const rows = day.items.filter((it) => it.meal === m.v);
        if (!rows.length) return null;
        return (
          <section key={m.v} className="pl-print-meal">
            <h2>وجبة {m.label}</h2>
            <ol className="pl-print-items">
              {rows.map((it) => (
                <li key={it.id} className={it.status}>
                  <div className="pl-pi-main">
                    <span className="pl-pi-name">{it.item}</span>
                    {it.qty ? <span className="pl-pi-qty">{it.qty}</span> : null}
                    {it.status && it.status !== 'pending' ? <StatusBadge value={it.status} /> : null}
                  </div>
                  {it.method ? <div className="pl-pi-line"><b>التجهيز:</b> {it.method}</div> : null}
                  {it.cook ? <div className="pl-pi-line"><b>الطباخ:</b> {it.cook}</div> : null}
                  {it.notes ? <div className="pl-pi-line"><b>ملاحظات:</b> {it.notes}</div> : null}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      {day.notes.length ? (
        <section className="pl-print-meal">
          <h2>ملاحظات المشتريات والوصول والتجهيز</h2>
          <ol className="pl-print-items">
            {day.notes.map((n) => (
              <li key={n.id} className={n.status}>
                <div className="pl-pi-main"><span>{n.text}</span></div>
                {n.owner ? <div className="pl-pi-line"><b>المسؤول / الحالة:</b> {n.owner}</div> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {day.external.length ? (
        <section className="pl-print-meal">
          <h2>الخارجي — {day.hijri}</h2>
          <ol className="pl-print-items">
            {day.external.map((x) => (
              <li key={x.id} className={x.status}>
                <div className="pl-pi-main"><span className="pl-pi-name">{x.meal}</span></div>
                {x.main_qty ? <div className="pl-pi-line"><b>كمية الإدام:</b> {x.main_qty}</div> : null}
                {x.rice_qty ? <div className="pl-pi-line"><b>كمية العيش / الخبز:</b> {x.rice_qty}</div> : null}
                {x.notes ? <div className="pl-pi-line"><b>الملاحظات:</b> {x.notes}</div> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
