'use client';

import { BATCHES, SUPPLY_LISTS, fruitBatchQty, formatNum } from '@/lib/plan/model';
import { PlanTable, AddButton, StatusBadge } from './Table';
import { matches } from './Filters';

// ------------------------------------------------------------------ tasks

export function TasksSection({ tasks, editable, f = {} }) {
  const rows = tasks.filter((t) => (!f.status || (t.status || 'pending') === f.status) && matches(f.q, t.text, t.section, t.num));
  return (
    <>
      <PlanTable entity="task" rows={rows} editable={editable} numbered={false} empty="لا توجد مهام مطابقة" />
      {editable ? <AddButton entity="task">مهمة / ملاحظة</AddButton> : null}
    </>
  );
}

// ------------------------------------------------------------------ fruit

const batchCell = (b) => ({
  label: BATCHES[b - 1].label,
  w: 90,
  render: (r) => formatNum(fruitBatchQty(r, b)) || '—',
});

export function FruitMaster({ fruit, editable, f = {} }) {
  const rows = fruit.filter((r) => (!f.status || r.status === f.status) && matches(f.q, r.item, r.unit, r.notes));
  return (
    <>
      <p className="pl-hint">الفواكه التي تتحمّل التخزين تُطلب كاملة في الدفعة الأولى، والسريعة التلف تُقسم على 3 دفعات — كميات الدفعات تُحسب تلقائياً من الكمية الإجمالية.</p>
      <PlanTable entity="fruit" rows={rows} editable={editable} trail={[batchCell(1), batchCell(2), batchCell(3)]} />
      {editable ? <AddButton entity="fruit">صنف فاكهة</AddButton> : null}
    </>
  );
}

// Branch view: one purchase list per batch, like the workbook.
export function FruitBatches({ fruit, f = {} }) {
  const rows = fruit.filter((r) => matches(f.q, r.item, r.unit, r.notes));
  return BATCHES.map((b) => (
    <section key={b.v} className="pl-meal">
      <h4 className="pl-meal-head">قائمة مشتريات {b.label}</h4>
      <PlanTable
        entity="fruit"
        rows={rows}
        cols={['item', 'total_qty']}
        trail={[
          { label: 'كمية الطلب لهذه الدفعة', w: 110, render: (r) => formatNum(fruitBatchQty(r, b.v)) || '—' },
          {
            label: 'وحدة القياس / ملاحظة',
            w: 220,
            render: (r) => `${r.unit || ''} — ${Number(r.perishable) ? 'مقسمة (ثلث الكمية - سريعة التلف)' : b.v === '1' ? 'تطلب كاملة دفعة واحدة (تتحمل التخزين)' : 'تم طلبها بالكامل في الدفعة الأولى'}${r.notes ? ' — ' + r.notes : ''}`,
          },
          { label: 'الحالة', w: 100, render: (r) => <StatusBadge value={r.status} /> },
        ]}
        editable={false}
      />
    </section>
  ));
}

// ------------------------------------------------------------------ vegetables

export function VegBatches({ veg, editable, f = {} }) {
  const rows = veg.filter((r) => (!f.status || r.status === f.status) && matches(f.q, r.item, r.price, r.qty, r.notes));
  return BATCHES.map((b) => (
    <section key={b.v} className="pl-meal">
      <h4 className="pl-meal-head">قائمة الخضروات — {b.label}</h4>
      <PlanTable
        entity="veg"
        rows={rows.filter((r) => String(r.batch) === b.v)}
        cols={editable ? ['batch', 'item', 'price', 'qty', 'notes', 'status'] : ['item', 'price', 'qty', 'notes', 'status']}
        editable={editable}
        empty="لا توجد أصناف في هذه الدفعة"
      />
      {editable ? <AddButton entity="veg" defaults={{ batch: b.v }}>صنف خضار ({b.label})</AddButton> : null}
    </section>
  ));
}

// ------------------------------------------------------------------ supplies

const LIST_COLS = {
  buffet: ['item', 'price', 'qty', 'notes', 'available', 'status'],
  tools: ['item', 'qty', 'notes', 'price', 'available', 'status'],
  cleaning: ['item', 'qty', 'notes', 'price', 'available', 'status'],
  food: ['item', 'price', 'unit', 'qty', 'notes', 'available', 'status'],
};

export const supplierOf = (r) => (r.supplier || '').trim() || (r.grp || '').trim() || 'بدون مورد محدد';

export function SuppliesSection({ supplies, editable, f = {}, lists = SUPPLY_LISTS.map((l) => l.v) }) {
  const rows = supplies.filter(
    (r) => (!f.status || r.status === f.status) && (!f.list || r.list === f.list) && matches(f.q, r.item, r.supplier, r.grp, r.notes, r.qty, r.available)
  );
  return SUPPLY_LISTS.filter((l) => lists.includes(l.v) && (!f.list || f.list === l.v)).map((l) => {
    const inList = rows.filter((r) => r.list === l.v);
    const cols = editable ? [...LIST_COLS[l.v], 'list', ...(l.v === 'food' ? ['supplier'] : [])] : LIST_COLS[l.v];
    if (l.v !== 'food') {
      return (
        <section key={l.v} className="pl-meal" id={`list-${l.v}`}>
          <h4 className="pl-meal-head">{l.label} <small>({inList.length})</small></h4>
          <PlanTable entity="supply" rows={inList} cols={cols} editable={editable} empty="لا توجد أصناف" />
          {editable ? <AddButton entity="supply" defaults={{ list: l.v }}>صنف</AddButton> : null}
        </section>
      );
    }
    // Food purchases: grouped by supplier.
    const groups = new Map();
    for (const r of inList) {
      const key = supplierOf(r);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    return (
      <section key={l.v} className="pl-meal" id="list-food">
        <h4 className="pl-meal-head">{l.label} — حسب المورد <small>({inList.length})</small></h4>
        {[...groups.entries()].map(([name, grp]) => (
          <div key={name} className="pl-group">
            <h5 className="pl-group-head">{name} <small>({grp.length})</small></h5>
            <PlanTable entity="supply" rows={grp} cols={cols} editable={editable} />
            {editable ? <AddButton entity="supply" defaults={{ list: 'food', supplier: grp[0].supplier || '', grp: grp[0].grp || '' }}>صنف لدى {name}</AddButton> : null}
          </div>
        ))}
        {!groups.size ? <p className="pl-muted">لا توجد أصناف</p> : null}
        {editable ? <AddButton entity="supply" defaults={{ list: 'food' }}>صنف لمورد جديد</AddButton> : null}
      </section>
    );
  });
}
