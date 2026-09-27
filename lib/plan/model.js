// Shared (client + server) description of the Arbaeen feeding & purchasing
// plan. One registry drives validation, the editable tables, the audit log,
// the trash, snapshots and Excel export — so a field is declared once.

export const PLAN_TITLE = 'خطة التغذية والمشتريات — الأربعين 2027';

export const STATUS = [
  { v: 'pending', label: 'قيد الانتظار' },
  { v: 'done', label: 'تم' },
  { v: 'cancelled', label: 'ملغي' },
];
export const STATUS_LABEL = Object.fromEntries(STATUS.map((s) => [s.v, s.label]));

export const MEALS = [
  { v: 'breakfast', label: 'الفطور' },
  { v: 'lunch', label: 'الغداء' },
  { v: 'dinner', label: 'العشاء' },
];
export const MEAL_LABEL = Object.fromEntries(MEALS.map((m) => [m.v, m.label]));

// Category of a meal item. The appetizers branch is every item whose category
// is an appetizer/salad/soup or a dessert/fruit.
export const CATEGORIES = [
  { v: '', label: '—' },
  { v: 'main', label: 'طبق رئيسي' },
  { v: 'side', label: 'طبق ثانوي' },
  { v: 'appetizer', label: 'مقبلات وسلطات وشوربات' },
  { v: 'dessert', label: 'الحلو والفاكهة' },
];
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.v, c.label]));
export const APPETIZER_CATEGORIES = ['appetizer', 'dessert'];

export const PRIORITIES = [
  { v: '', label: '—' },
  { v: 'high', label: 'عالية' },
  { v: 'medium', label: 'متوسطة' },
  { v: 'low', label: 'منخفضة' },
];
export const PRIORITY_LABEL = Object.fromEntries(PRIORITIES.map((p) => [p.v, p.label]));

export const SUPPLY_LISTS = [
  { v: 'buffet', label: 'مستلزمات البوفيه والسفري' },
  { v: 'tools', label: 'أدوات المطبخ والبوفية' },
  { v: 'cleaning', label: 'المنظفات' },
  { v: 'food', label: 'مشتريات المواد الغذائية' },
];
export const SUPPLY_LIST_LABEL = Object.fromEntries(SUPPLY_LISTS.map((s) => [s.v, s.label]));

export const BATCHES = [
  { v: '1', label: 'الدفعة الأولى' },
  { v: '2', label: 'الدفعة الثانية' },
  { v: '3', label: 'الدفعة الثالثة' },
];
export const BATCH_LABEL = { 1: 'الدفعة الأولى', 2: 'الدفعة الثانية', 3: 'الدفعة الثالثة' };

// type: text | textarea | number | date | select | status | bool
export const ENTITIES = {
  task: {
    table: 'plan_tasks',
    label: 'سجل الملاحظات والمهام',
    one: 'مهمة',
    title: (r) => r.text,
    fields: [
      { k: 'num', label: 'الرقم (#)', type: 'text', w: 60 },
      { k: 'date', label: 'تاريخ الملاحظة', type: 'date', w: 120 },
      { k: 'priority', label: 'الأولوية', type: 'select', options: PRIORITIES, w: 90 },
      { k: 'text', label: 'الملاحظة / المهمة', type: 'textarea', w: 340 },
      { k: 'section', label: 'القسم / التصنيف', type: 'text', w: 130 },
      { k: 'deadline', label: 'الموعد النهائي', type: 'date', w: 120 },
      { k: 'status', label: 'الحالة', type: 'status', w: 110 },
    ],
  },
  day: {
    table: 'plan_days',
    label: 'أيام جدول التغذية',
    one: 'يوم',
    title: (r) => `اليوم رقم (${r.day_no ?? ''}) — ${r.hijri || ''}`,
    fields: [
      { k: 'day_no', label: 'رقم اليوم', type: 'number', w: 70 },
      { k: 'hijri', label: 'التاريخ الهجري', type: 'text', w: 100 },
      { k: 'gregorian', label: 'التاريخ الميلادي', type: 'date', w: 120 },
      { k: 'headcount', label: 'العدد (شخص)', type: 'number', w: 80 },
      { k: 'title', label: 'ملاحظة اليوم', type: 'textarea', w: 300 },
    ],
  },
  meal_item: {
    table: 'plan_meal_items',
    parent: 'day_id',
    label: 'أصناف الوجبات',
    one: 'صنف',
    title: (r) => r.item,
    fields: [
      { k: 'meal', label: 'الوجبة', type: 'select', options: MEALS, w: 80 },
      { k: 'item', label: 'النوع / الصنف', type: 'textarea', w: 240 },
      { k: 'qty', label: 'العدد / الكمية', type: 'text', w: 110 },
      { k: 'method', label: 'طريقة الطبخ / التجهيز', type: 'textarea', w: 220 },
      { k: 'cook', label: 'اسم الطباخ', type: 'text', w: 100 },
      { k: 'notes', label: 'ملاحظات', type: 'textarea', w: 170 },
      { k: 'status', label: 'حالة التنفيذ', type: 'status', w: 110 },
      { k: 'category', label: 'التصنيف', type: 'select', options: CATEGORIES, w: 140 },
    ],
  },
  day_note: {
    table: 'plan_day_notes',
    parent: 'day_id',
    label: 'ملاحظات المشتريات والوصول والتجهيز',
    one: 'ملاحظة',
    title: (r) => r.text,
    fields: [
      { k: 'text', label: 'تفاصيل الملاحظات والتجهيز العام', type: 'textarea', w: 420 },
      { k: 'owner', label: 'المسؤول / الحالة', type: 'text', w: 150 },
      { k: 'status', label: 'الحالة', type: 'status', w: 110 },
    ],
  },
  external: {
    table: 'plan_external',
    parent: 'day_id',
    label: 'الموكب الخارجي',
    one: 'توزيع خارجي',
    title: (r) => r.meal,
    fields: [
      { k: 'meal', label: 'الوجبة', type: 'textarea', w: 300 },
      { k: 'main_qty', label: 'كمية الإدام', type: 'text', w: 150 },
      { k: 'rice_qty', label: 'كمية العيش / الخبز', type: 'text', w: 140 },
      { k: 'notes', label: 'الملاحظات', type: 'textarea', w: 180 },
      { k: 'status', label: 'حالة التنفيذ', type: 'status', w: 110 },
    ],
  },
  fruit: {
    table: 'plan_fruit',
    label: 'طلبات الفواكه',
    one: 'صنف فاكهة',
    title: (r) => r.item,
    fields: [
      { k: 'item', label: 'الصنف', type: 'text', w: 140 },
      { k: 'total_qty', label: 'الكمية الإجمالية', type: 'number', w: 100 },
      { k: 'unit', label: 'وحدة القياس', type: 'text', w: 110 },
      { k: 'perishable', label: 'سريعة التلف (تُقسم على 3)', type: 'bool', w: 110 },
      { k: 'notes', label: 'ملاحظات', type: 'textarea', w: 180 },
      { k: 'status', label: 'الحالة', type: 'status', w: 110 },
    ],
  },
  veg: {
    table: 'plan_veg',
    label: 'الخضروات',
    one: 'صنف خضار',
    title: (r) => r.item,
    fields: [
      { k: 'batch', label: 'الدفعة', type: 'select', options: BATCHES, w: 110 },
      { k: 'item', label: 'الصنف', type: 'text', w: 140 },
      { k: 'price', label: 'السعر', type: 'text', w: 130 },
      { k: 'qty', label: 'الكمية', type: 'text', w: 130 },
      { k: 'notes', label: 'ملاحظات والتعديلات', type: 'textarea', w: 260 },
      { k: 'status', label: 'الحالة', type: 'status', w: 110 },
    ],
  },
  supply: {
    table: 'plan_supplies',
    label: 'المستلزمات والمشتريات',
    one: 'صنف',
    title: (r) => r.item,
    fields: [
      { k: 'list', label: 'القائمة', type: 'select', options: SUPPLY_LISTS, w: 150 },
      { k: 'supplier', label: 'المورد / المصدر', type: 'text', w: 150 },
      { k: 'item', label: 'الصنف', type: 'textarea', w: 240 },
      { k: 'price', label: 'السعر', type: 'text', w: 120 },
      { k: 'unit', label: 'وحدة القياس', type: 'text', w: 100 },
      { k: 'qty', label: 'الكمية', type: 'text', w: 120 },
      { k: 'notes', label: 'الملاحظات', type: 'textarea', w: 220 },
      { k: 'available', label: 'متوفر حالياً / شراء الفرق', type: 'text', w: 140 },
      { k: 'status', label: 'الحالة', type: 'status', w: 110 },
    ],
  },
};

export const ENTITY_KEYS = Object.keys(ENTITIES);

export function fieldsOf(entity) {
  return ENTITIES[entity]?.fields || [];
}
export function fieldLabel(entity, k) {
  return fieldsOf(entity).find((f) => f.k === k)?.label || k;
}

// Human-readable value of a field (for history, print, export).
export function displayValue(entity, k, v) {
  if (v === null || v === undefined || v === '') return '';
  const f = fieldsOf(entity).find((x) => x.k === k);
  if (!f) return String(v);
  if (f.type === 'status') return STATUS_LABEL[v] || String(v);
  if (f.type === 'bool') return Number(v) ? 'نعم' : 'لا';
  if (f.type === 'select') return f.options.find((o) => String(o.v) === String(v))?.label || String(v);
  return String(v);
}

// Fruit: long-lasting fruit is ordered in full in batch 1; perishable fruit is
// split into thirds across the three batches.
export function fruitBatchQty(row, batch) {
  const total = Number(row.total_qty);
  if (!Number.isFinite(total)) return null;
  if (Number(row.perishable)) return Math.round((total / 3) * 100) / 100;
  return Number(batch) === 1 ? total : null;
}

export function formatNum(n) {
  if (n === null || n === undefined || n === '') return '';
  const x = Number(n);
  if (!Number.isFinite(x)) return String(n);
  return String(Math.round(x * 100) / 100);
}

// "2027-07-10" → "10/7/2027" (as the workbook writes dates).
export function formatDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])}/${Number(m[2])}/${m[1]}`;
}

export function dayLabel(d) {
  if (!d) return '';
  return `اليوم ${d.day_no ?? ''} (${d.hijri || formatDate(d.gregorian)})`;
}
