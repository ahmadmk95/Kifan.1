'use client';

import Link from 'next/link';
import { MEALS, formatDate } from '@/lib/plan/model';
import { PlanTable, AddButton, Cell, RowActions } from './Table';

const MEAL_COLS = ['item', 'qty', 'method', 'cook', 'notes', 'status', 'category'];

// Header line of a day, as the workbook writes it.
export function dayHeading(d) {
  return [
    `جدول تغذية الخدام — اليوم ${d.hijri || ''}`,
    d.gregorian ? `التاريخ: ${formatDate(d.gregorian)}` : null,
    `اليوم رقم (${d.day_no ?? ''})`,
    d.headcount ? `العدد ${d.headcount} شخص` : null,
  ].filter(Boolean).join(' | ');
}

// One day of the feeding plan: meals, the day's notes and the external
// procession entries. `filter` (optional) narrows the rows shown.
export function DayBlock({ day, editable, filter, showExternal = true, showNotes = true, open = true }) {
  const items = filter ? day.items.filter(filter.item) : day.items;
  const notes = filter?.note ? day.notes.filter(filter.note) : day.notes;
  const external = filter?.external ? day.external.filter(filter.external) : day.external;

  return (
    <details className="pl-day" id={`day-${day.id}`} open={open}>
      <summary className="pl-day-head">
        <span className="pl-day-title">{dayHeading(day)}</span>
        {day.title ? <span className="pl-day-note">{day.title}</span> : null}
      </summary>
      <div className="pl-day-body">
        <div className="pl-day-tools">
          <Link href={`/plan/day/${day.id}`} className="pl-btn sm ghost">🖨 عرض الطباخ / طباعة</Link>
          {editable ? <RowActions entity="day" row={day} /> : null}
        </div>
        {editable ? (
          <div className="pl-day-fields">
            {['day_no', 'hijri', 'gregorian', 'headcount', 'title'].map((k) => (
              <label key={k} className={'pl-field f-' + k}>
                <span>{{ day_no: 'رقم اليوم', hijri: 'التاريخ الهجري', gregorian: 'التاريخ الميلادي', headcount: 'العدد', title: 'ملاحظة اليوم' }[k]}</span>
                <Cell entity="day" row={day} k={k} editable />
              </label>
            ))}
          </div>
        ) : null}

        {MEALS.map((m) => {
          const rows = items.filter((it) => it.meal === m.v);
          if (!rows.length && !editable && filter?.active) return null;
          return (
            <section key={m.v} className="pl-meal">
              <h4 className="pl-meal-head">وجبة {m.label}</h4>
              <PlanTable entity="meal_item" rows={rows} cols={editable ? MEAL_COLS : MEAL_COLS.filter((c) => c !== 'category')} editable={editable} empty="لا توجد أصناف" />
              {editable ? <AddButton entity="meal_item" defaults={{ day_id: day.id, meal: m.v }}>صنف لوجبة {m.label}</AddButton> : null}
            </section>
          );
        })}

        {showNotes && (notes.length || editable) ? (
          <section className="pl-meal">
            <h4 className="pl-meal-head">ملاحظات المشتريات والوصول والتجهيز العام</h4>
            <PlanTable entity="day_note" rows={notes} editable={editable} empty="لا توجد ملاحظات" />
            {editable ? <AddButton entity="day_note" defaults={{ day_id: day.id }}>ملاحظة</AddButton> : null}
          </section>
        ) : null}

        {showExternal && (external.length || editable) ? (
          <section className="pl-meal external">
            <h4 className="pl-meal-head">الخارجي — {day.hijri}</h4>
            <PlanTable entity="external" rows={external} editable={editable} empty="لا يوجد توزيع خارجي" />
            {editable ? <AddButton entity="external" defaults={{ day_id: day.id }}>توزيع خارجي</AddButton> : null}
          </section>
        ) : null}
      </div>
    </details>
  );
}
