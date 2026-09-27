// Excel import / export for the plan.
//
// Import understands two layouts:
//   1. The original workbook («الجدول الكامل» sheet with titles, merged cells
//      and sub-tables) — parsed section by section.
//   2. This app's own export (one flat sheet per table, with an «المعرّف»
//      column) — so an exported file can be edited in Excel and loaded back.
//
// Both produce a "dump": { plan_tasks: [...], plan_days: [...], ... } that
// store.replaceAll() writes in one transaction.
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import {
  ENTITIES, ENTITY_KEYS, STATUS, MEAL_LABEL, fruitBatchQty, displayValue, dayLabel, formatNum,
} from './model';

const uid = () => crypto.randomUUID();
const stamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const COLS = 'ABCDEFGH'.split('');

// ---------------------------------------------------------------- cells

function cellText(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if ('result' in v) return cellText(v.result);
    if ('formula' in v || 'sharedFormula' in v) return '';
    if (v.text !== undefined) return cellText(v.text);
    if (v.error) return '';
    return '';
  }
  return String(v);
}
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const isNumeric = (s) => /^[\d.,\s٠-٩]+$/.test(s);

// Row → { A: 'text', B: ... } using only the top-left cell of merged ranges.
function sheetRows(ws) {
  const out = [];
  ws.eachRow({ includeEmpty: false }, (row, r) => {
    const cells = {};
    COLS.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      if (cell.isMerged && cell.master && cell.master.address !== cell.address) return;
      // Formula cells (e.g. =ROW()-…) carry no data of their own here.
      const v = cell.value;
      if (v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v) && !(v.result instanceof Date) && typeof v.result !== 'string') {
        if (i === 0) return; // row numbers
      }
      const t = clean(cellText(v));
      if (t) cells[c] = t;
    });
    if (Object.keys(cells).length) out.push({ r, cells });
  });
  return out;
}

// Normalised form for loose text matching.
function norm(s) {
  return String(s || '')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, '')
    .trim();
}

function statusFrom(s) {
  const t = norm(s);
  if (!t) return 'pending';
  if (/^(تم|منجز|منتهي|done|مكتمل|تمالتنفيذ)/i.test(t)) return 'done';
  if (/^(ملغي|ملغا|الغاء|cancel)/i.test(t)) return 'cancelled';
  if (/^(قيدالانتظار|pending|انتظار)/i.test(t)) return 'pending';
  return null; // not a status word
}
function priorityFrom(s) {
  const t = norm(s);
  if (/عال|high|مهم/.test(t)) return 'high';
  if (/متوسط|medium/.test(t)) return 'medium';
  if (/منخفض|low/.test(t)) return 'low';
  return '';
}
function isoDate(s, year) {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(s);
  if (!m) return s;
  const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : year;
  return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- categories

const DESSERT_WORDS = ['حلو', 'برد', 'بوظه', 'عواد', 'رقي', 'بطيخ', 'بطبخ', 'يطبخ', 'ساقو', 'محلبيه', 'مهلبيه', 'جلي', 'فواكه', 'فاكهه', 'البه', 'شعريه', 'كيك', 'كريم'];
const APPETIZER_WORDS = ['سلطه', 'روب', 'حمص', 'متبل', 'بابا', 'غنوج', 'ميرزا', 'شوربه', 'طرشي', 'مخلل', 'فتوش', 'تبوله'];
const TABLE_CATEGORY = { 'مقبلات وسلطات وشوربات': 'appetizer', 'الحلو والفاكهة': 'dessert', 'طبق ثانوي': 'side', 'طبق رئيسي': 'main' };

function keywordCategory(text) {
  const t = norm(text);
  if (DESSERT_WORDS.some((w) => t.includes(w))) return 'dessert';
  if (APPETIZER_WORDS.some((w) => t.includes(w))) return 'appetizer';
  return '';
}

// ---------------------------------------------------------------- original layout

function parseOriginal(ws, { year = 2027 } = {}) {
  const rows = sheetRows(ws);
  const ts = stamp();
  const base = (sort) => ({ id: uid(), sort, deleted_at: null, created_at: ts, updated_at: ts });
  const dump = Object.fromEntries(ENTITY_KEYS.map((k) => [ENTITIES[k].table, []]));
  const warnings = [];

  let phase = null; // tasks | days | apps | skip | fruit | veg | supplies
  let day = null;
  let section = null; // breakfast | lunch | dinner | notes | external
  let mealCols = null;
  let pendingTitle = null;
  let fruitBatch = 0;
  let vegBatch = 0;
  let supplyList = null;
  let supplyHeader = null;
  let supplyTitle = null; // { text, r }
  let taskCols = null;
  const appetizerRefs = []; // { dayNo, meal, text, cat }
  const fruitSeen = new Map();
  const mealOrder = ['breakfast', 'lunch', 'dinner'];
  const appendTitle = (txt) => {
    if (!day || !txt) return;
    day.title = day.title ? `${day.title} · ${txt}` : txt;
  };
  const mealOf = (txt) => (/الفطور/.test(txt) ? 'breakfast' : /الغداء/.test(txt) ? 'lunch' : /العشاء/.test(txt) ? 'dinner' : null);
  const nextMeal = () => {
    const i = mealOrder.indexOf(section);
    return i >= 0 && i < 2 ? mealOrder[i + 1] : i === -1 && !day?.items?.length ? 'breakfast' : section || 'breakfast';
  };
  const addTask = (text, extra = {}) => {
    dump.plan_tasks.push({ ...base(dump.plan_tasks.length + 1), num: String(dump.plan_tasks.length + 1), date: null, priority: '', text, section: '', deadline: null, status: 'pending', ...extra });
  };
  const addItem = (fields) => {
    day.items.push(fields);
  };

  for (const { r, cells } of rows) {
    const A = cells.A || '';
    const texts = COLS.map((c) => cells[c]).filter(Boolean);
    const joined = texts.join(' ');
    const single = texts.length === 1 ? texts[0] : null;

    // ---- section switches (titles anywhere in the row)
    if (/^سجل الملاحظات والمهام/.test(A)) { phase = 'tasks'; continue; }
    if (/^جدول تغذية الخدام/.test(A)) {
      phase = 'days';
      section = null;
      pendingTitle = null;
      const m = (re) => re.exec(A);
      const hijri = m(/اليوم:?\s*(\d+\s*[^\s|]+)/);
      const date = m(/التاريخ:?\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
      const no = m(/رقم\s*\((\d+)\)/);
      const count = m(/العدد\s*(\d+)/);
      let note = '';
      const after = /رقم\s*\(\d+\)\s*([^|]*?)\s*(?:\||العدد|$)/.exec(A);
      if (after && after[1]) note = clean(after[1]);
      day = {
        ...base(dump.plan_days.length + 1),
        day_no: no ? Number(no[1]) : dump.plan_days.length + 1,
        hijri: hijri ? clean(hijri[1]) : '',
        gregorian: date ? isoDate(date[1], year) : null,
        headcount: count ? Number(count[1]) : null,
        title: note,
        items: [], notes: [], external: [],
      };
      dump.plan_days.push(day);
      continue;
    }
    if (/^جدول المقبلات/.test(A)) { phase = 'apps'; continue; }
    if (/^ملاحظات اليوم/.test(A)) { phase = 'skip'; continue; } // duplicate of that day's notes
    if (/^جدول طلبات الفواكه/.test(A)) { phase = 'fruit'; continue; }
    if (phase === 'fruit' && /^قائمة مشتريات الدفعة/.test(A)) {
      fruitBatch = /الأولى|الاولى/.test(A) ? 1 : /الثانية/.test(A) ? 2 : 3;
      continue;
    }
    if (/^قائمة الخضروات/.test(A)) {
      phase = 'veg';
      vegBatch = /الأولى|الاولى/.test(A) ? 1 : /الثانية/.test(A) ? 2 : 3;
      continue;
    }
    if (/^قائمة مستلزمات البوفيه/.test(A)) { phase = 'supplies'; supplyList = 'buffet'; supplyHeader = null; supplyTitle = null; continue; }
    if (/^قائمة أدوات|^قائمة ادوات/.test(A)) { phase = 'supplies'; supplyList = 'tools'; supplyHeader = null; supplyTitle = null; continue; }
    if (/^قائمة المنظفات/.test(A)) { phase = 'supplies'; supplyList = 'cleaning'; supplyHeader = null; supplyTitle = null; continue; }
    if (phase === 'supplies' && texts.some((t) => /قائمة طلبية|مشتريات المواد الغذائية/.test(t))) {
      supplyList = 'food';
      supplyHeader = null;
      const title = texts.find((t) => /قائمة طلبية|مشتريات المواد الغذائية/.test(t));
      supplyTitle = { text: title.replace(/^قائمة\s*/, ''), r };
      // Anything else on that row is a standing instruction — keep it as a task.
      for (const t of texts) if (t !== title) addTask(t.replace(/^ملاحظة:\s*/, ''), { section: 'المشتريات' });
      continue;
    }

    // ---- tasks
    if (phase === 'tasks') {
      if (!taskCols && texts.some((t) => /الملاحظة/.test(t)) && texts.some((t) => /الرقم/.test(t))) {
        taskCols = {};
        for (const c of COLS) {
          const h = cells[c] || '';
          if (/الرقم/.test(h)) taskCols.num = c;
          else if (/تاريخ/.test(h)) taskCols.date = c;
          else if (/الأولوية|الاولوية/.test(h)) taskCols.priority = c;
          else if (/الملاحظة|المهمة/.test(h)) taskCols.text = c;
          else if (/القسم|التصنيف/.test(h)) taskCols.section = c;
          else if (/الموعد/.test(h)) taskCols.deadline = c;
          else if (/الحالة/.test(h)) taskCols.status = c;
        }
        continue;
      }
      const tc = taskCols || { num: 'A', date: 'B', priority: 'C', text: 'D', section: 'E', deadline: 'F', status: 'G' };
      const text = cells[tc.text];
      if (!text) continue;
      addTask(text, {
        num: cells[tc.num] || String(dump.plan_tasks.length + 1),
        date: isoDate(cells[tc.date], year),
        priority: priorityFrom(cells[tc.priority]),
        section: cells[tc.section] || '',
        deadline: isoDate(cells[tc.deadline], year),
        status: statusFrom(cells[tc.status]) || 'pending',
      });
      continue;
    }

    // ---- days
    if (phase === 'days' && day) {
      const isHeader = (A === 'م' || A === 'ت') && cells.B;
      if (isHeader) {
        const B = cells.B;
        if (/تفاصيل الملاحظات/.test(B)) {
          if (pendingTitle) {
            // A lone line just before the notes table belongs to the last meal.
            if (mealOrder.includes(section)) addItem({ meal: section, item: pendingTitle, qty: '', method: '', cook: '', notes: '', status: 'pending' });
            else appendTitle(pendingTitle);
            pendingTitle = null;
          }
          section = 'notes';
        } else if (/^الوجبة/.test(B)) {
          section = 'external';
        } else if (/النوع|الصنف/.test(B)) {
          if (!mealOrder.includes(section) || pendingTitle) {
            section = pendingTitle ? nextMeal() : section && mealOrder.includes(section) ? section : nextMeal();
            if (pendingTitle) appendTitle(pendingTitle);
            pendingTitle = null;
          }
          mealCols = {};
          for (const c of ['C', 'D', 'E', 'F', 'G']) {
            const h = cells[c] || '';
            if (/العدد|الكمية/.test(h)) mealCols.qty = c;
            else if (/طريقة|التجهيز/.test(h)) mealCols.method = c;
            else if (/الطباخ/.test(h)) mealCols.cook = c;
            else if (/حالة/.test(h)) mealCols.status = c;
            else if (/ملاحظات/.test(h)) mealCols.notes = c;
          }
        }
        continue;
      }
      // Single text cell in column A = a section title.
      if (single && single === A && !isNumeric(A)) {
        if (/^الخارجي/.test(A)) { section = 'external'; pendingTitle = null; continue; }
        if (/^جدول ملاحظات/.test(A)) { section = 'notes'; pendingTitle = null; continue; }
        const meal = /وجبة|^الفطور|^الغداء|^العشاء/.test(A) ? mealOf(A) : null;
        if (meal) {
          section = meal;
          pendingTitle = null;
          const rest = clean(A.replace(/وجبة\s*(الفطور|الغداء|العشاء)/, ''));
          if (rest) appendTitle(`${MEAL_LABEL[meal]}: ${rest}`);
          continue;
        }
        pendingTitle = A;
        continue;
      }
      if (mealOrder.includes(section)) {
        const item = cells.B;
        if (!item) continue;
        const mc = mealCols || { qty: 'C', method: 'D', cook: 'E', notes: 'F' };
        let status = 'pending';
        let notes = mc.notes ? cells[mc.notes] || '' : '';
        if (mc.status && cells[mc.status]) {
          const s = statusFrom(cells[mc.status]);
          if (s) status = s;
          else notes = [notes, cells[mc.status]].filter(Boolean).join(' — ');
        }
        addItem({
          meal: section,
          item,
          qty: cells[mc.qty] || '',
          method: cells[mc.method] || '',
          cook: cells[mc.cook] || '',
          notes,
          status,
        });
      } else if (section === 'notes') {
        const text = ['B', 'C', 'D', 'E'].map((c) => cells[c]).filter(Boolean).join(' — ');
        if (!text) continue;
        const owner = cells.F || '';
        day.notes.push({ text, owner, status: statusFrom(owner) || 'pending' });
      } else if (section === 'external') {
        if (!cells.B && !cells.C && !cells.D && !cells.E) continue;
        day.external.push({
          meal: cells.B || '',
          main_qty: cells.C || '',
          rice_qty: cells.D || '',
          notes: cells.E || '',
          status: statusFrom(cells.F) || 'pending',
        });
      }
      continue;
    }

    // ---- appetizers table (used to categorise meal items)
    if (phase === 'apps') {
      if (cells.A === 'م') continue;
      const dm = /اليوم\s*(\d+)/.exec(cells.B || '');
      if (!dm || !cells.D) continue;
      const meal = mealOf(cells.C || '');
      appetizerRefs.push({ dayNo: Number(dm[1]), meal, text: cells.D, cat: TABLE_CATEGORY[cells.E] || keywordCategory(cells.D) });
      continue;
    }

    // ---- fruit (one row per fruit; batch quantities are derived)
    if (phase === 'fruit') {
      if (cells.A === 'م' || !cells.B) continue;
      const key = norm(cells.B);
      if (fruitSeen.has(key)) continue;
      const unitNote = cells.D || '';
      const [unit, ...rest] = unitNote.split(/\s+-\s+/);
      const total = Number(String(cells.C || '').replace(',', '.'));
      const row = {
        ...base(dump.plan_fruit.length + 1),
        item: cells.B,
        total_qty: Number.isFinite(total) && cells.C ? total : null,
        unit: clean(unit),
        perishable: /مقسمة|سريعة التلف/.test(unitNote) ? 1 : 0,
        notes: '',
        status: 'pending',
      };
      const restText = rest.join(' - ');
      if (restText && !/مقسمة|تطلب كاملة|تم طلبها/.test(restText)) row.notes = restText;
      fruitSeen.set(key, row);
      dump.plan_fruit.push(row);
      continue;
    }

    // ---- vegetables
    if (phase === 'veg') {
      if (cells.A === 'ت' || cells.A === 'م' || !cells.B) continue;
      dump.plan_veg.push({
        ...base(dump.plan_veg.length + 1),
        batch: vegBatch || 1,
        item: cells.B,
        price: cells.C || '',
        qty: cells.D || '',
        notes: cells.E || '',
        status: 'pending',
      });
      continue;
    }

    // ---- supplies & food purchases (sub-tables with their own headers)
    if (phase === 'supplies') {
      const headerCol = COLS.find((c) => /^(ال)?صنف$/.test(cells[c] || ''));
      if (headerCol) {
        supplyHeader = {};
        for (const c of COLS) {
          const h = cells[c];
          if (!h) continue;
          let f = null;
          if (/^(ال)?صنف$/.test(h)) f = 'item';
          else if (/المصدر/.test(h)) f = 'supplier';
          else if (/متوفر|بواقي/.test(h)) f = 'available';
          else if (/اجمالي|إجمالي|الإجمالي/.test(h)) f = null;
          else if (/سعر/.test(h)) f = 'price';
          else if (/وحدة/.test(h)) f = 'unit';
          else if (/كمي/.test(h)) f = 'qty';
          else if (/ملاحظ/.test(h)) f = 'notes';
          else if (/^(ت|م|#)$/.test(h)) continue;
          supplyHeader[c] = f || `extra:${h}`;
        }
        // A title counts only when it sits right above this header.
        supplyHeader.__title = supplyTitle && r - supplyTitle.r <= 3 ? supplyTitle.text : '';
        continue;
      }
      const itemCol = supplyHeader && Object.keys(supplyHeader).find((c) => supplyHeader[c] === 'item');
      const item = itemCol ? cells[itemCol] : null;
      if (!item) {
        // Short text-only row = the title of the next sub-table.
        if (texts.length && texts.length <= 2 && !texts.some(isNumeric)) supplyTitle = { text: texts[texts.length - 1], r };
        continue;
      }
      const rec = { supplier: '', item, price: '', unit: '', qty: '', notes: '', available: '' };
      const extras = [];
      for (const [c, f] of Object.entries(supplyHeader)) {
        if (c === '__title' || !cells[c] || f === 'item') continue;
        if (f.startsWith('extra:')) extras.push(`${f.slice(6)}: ${cells[c]}`);
        else rec[f] = rec[f] ? `${rec[f]} — ${cells[c]}` : cells[c];
      }
      if (extras.length) rec.notes = [rec.notes, ...extras].filter(Boolean).join(' — ');
      const title = supplyHeader.__title || '';
      dump.plan_supplies.push({
        ...base(dump.plan_supplies.length + 1),
        list: supplyList,
        supplier: rec.supplier || (supplyList === 'food' ? title.replace(/\s*ومشتريات المواد الغذائية.*$/, '') : ''),
        grp: title,
        item: rec.item,
        price: rec.price,
        unit: rec.unit,
        qty: rec.qty,
        notes: rec.notes,
        available: rec.available,
        status: 'pending',
      });
      continue;
    }
  }

  // ---- flatten days, categorising meal items
  for (const d of dump.plan_days) {
    const refs = appetizerRefs.filter((a) => a.dayNo === d.day_no);
    const firstOf = {};
    d.items.forEach((it, i) => {
      let cat = '';
      if (it.meal !== 'breakfast') {
        if (/^الطبق الرئيسي/.test(it.item)) cat = 'main';
        if (!cat) {
          const n = norm(it.item);
          const ref = refs.find((a) => (!a.meal || a.meal === it.meal) && n.length >= 3 && (norm(a.text).startsWith(n) || n.startsWith(norm(a.text))));
          if (ref) cat = ref.cat;
        }
        if (!cat) cat = keywordCategory(it.item);
        if (!cat && !firstOf[it.meal]) cat = 'main';
        firstOf[it.meal] = true;
      }
      dump.plan_meal_items.push({ ...base(i + 1), day_id: d.id, ...it, category: cat });
    });
    d.notes.forEach((n, i) => dump.plan_day_notes.push({ ...base(i + 1), day_id: d.id, ...n }));
    d.external.forEach((x, i) => dump.plan_external.push({ ...base(i + 1), day_id: d.id, ...x }));
    delete d.items;
    delete d.notes;
    delete d.external;
  }
  if (!dump.plan_days.length) warnings.push('لم يتم العثور على أيام جدول التغذية في الملف.');
  return { dump, warnings };
}

// ---------------------------------------------------------------- flat layout

const FLAT_SHEETS = {
  task: 'سجل المهام',
  day: 'الأيام',
  meal_item: 'أصناف الوجبات',
  day_note: 'ملاحظات الأيام',
  external: 'الخارجي',
  fruit: 'الفواكه',
  veg: 'الخضروات',
  supply: 'المستلزمات والمشتريات',
};
const ID_COL = 'المعرّف';
const DAY_ID_COL = 'معرّف اليوم';
const DAY_COL = 'اليوم';

function fromDisplay(f, v) {
  const s = clean(v);
  if (f.type === 'status') return STATUS.find((x) => x.v === s || x.label === s)?.v || statusFrom(s) || 'pending';
  if (f.type === 'select') return f.options.find((o) => String(o.v) === s || o.label === s)?.v ?? f.options[0].v;
  if (f.type === 'bool') return /^(نعم|1|true|yes)$/i.test(s) ? 1 : 0;
  if (f.type === 'number') {
    if (!s) return null;
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (f.type === 'date') return s ? isoDate(s, 2027) : null;
  return s;
}

function parseFlat(wb) {
  const ts = stamp();
  const dump = Object.fromEntries(ENTITY_KEYS.map((k) => [ENTITIES[k].table, []]));
  const dayIdByNo = new Map();
  for (const entity of ['day', ...ENTITY_KEYS.filter((k) => k !== 'day')]) {
    const e = ENTITIES[entity];
    const ws = wb.getWorksheet(FLAT_SHEETS[entity]);
    if (!ws) continue;
    const rows = sheetRows(ws);
    if (!rows.length) continue;
    const header = rows[0].cells;
    const colOf = {};
    for (const [c, h] of Object.entries(header)) {
      if (h === ID_COL) colOf.id = c;
      else if (h === DAY_ID_COL) colOf.day_id = c;
      else if (h === DAY_COL) colOf.day = c;
      else {
        const f = e.fields.find((x) => x.label === h || x.k === h);
        if (f) colOf[f.k] = c;
      }
    }
    rows.slice(1).forEach(({ cells }, i) => {
      const rec = { id: cells[colOf.id] || uid(), sort: i + 1, deleted_at: null, created_at: ts, updated_at: ts };
      for (const f of e.fields) rec[f.k] = colOf[f.k] ? fromDisplay(f, cells[colOf[f.k]]) : fromDisplay(f, '');
      if (e.parent) {
        let did = cells[colOf.day_id];
        if (!did || !dump.plan_days.some((d) => d.id === did)) {
          const m = /اليوم\s*(\d+)/.exec(cells[colOf.day] || '');
          did = m ? dayIdByNo.get(Number(m[1])) : null;
        }
        if (!did) return;
        rec.day_id = did;
      }
      if (!Object.values(rec).some((v, j) => j > 4 && v)) return; // empty line
      dump[e.table].push(rec);
      if (entity === 'day') dayIdByNo.set(Number(rec.day_no), rec.id);
    });
  }
  return { dump, warnings: [] };
}

// ---------------------------------------------------------------- entry points

export async function parseWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  if (wb.getWorksheet(FLAT_SHEETS.day) && wb.getWorksheet(FLAT_SHEETS.meal_item)) {
    return { format: 'flat', ...parseFlat(wb) };
  }
  let ws = wb.getWorksheet('الجدول الكامل');
  if (!ws) {
    ws = wb.worksheets.find((s) => {
      let hit = false;
      s.eachRow((row) => {
        if (!hit && /جدول تغذية الخدام/.test(cellText(row.getCell(1).value))) hit = true;
      });
      return hit;
    });
  }
  if (!ws) return { format: 'unknown', dump: null, warnings: ['لم يتم التعرف على الملف. ارفع ملف الخطة الأصلي أو ملفاً صدّرته من هذا الموقع.'] };
  return { format: 'original', ...parseOriginal(ws) };
}

export function summarize(dump) {
  if (!dump) return null;
  const n = (t) => (dump[t] || []).filter((r) => !r.deleted_at).length;
  return {
    tasks: n('plan_tasks'),
    days: n('plan_days'),
    items: n('plan_meal_items'),
    notes: n('plan_day_notes'),
    external: n('plan_external'),
    fruit: n('plan_fruit'),
    veg: n('plan_veg'),
    supplies: n('plan_supplies'),
  };
}

// Rows of one table as display values, for Excel and CSV.
function exportRows(entity, plan) {
  const e = ENTITIES[entity];
  const days = new Map(plan.days.map((d) => [d.id, d]));
  const src = {
    task: plan.tasks,
    day: plan.days,
    meal_item: plan.days.flatMap((d) => d.items),
    day_note: plan.days.flatMap((d) => d.notes),
    external: plan.days.flatMap((d) => d.external),
    fruit: plan.fruit,
    veg: plan.veg,
    supply: plan.supplies,
  }[entity];
  const header = [ID_COL, ...(e.parent ? [DAY_ID_COL, DAY_COL] : []), ...e.fields.map((f) => f.label)];
  if (entity === 'fruit') header.push('الدفعة الأولى', 'الدفعة الثانية', 'الدفعة الثالثة');
  const body = src.map((r) => {
    const out = [r.id];
    if (e.parent) out.push(r.day_id, dayLabel(days.get(r.day_id)));
    for (const f of e.fields) {
      const v = r[f.k];
      out.push(f.type === 'number' ? (v === null || v === undefined ? '' : Number(v)) : f.type === 'date' ? v || '' : displayValue(entity, f.k, v));
    }
    if (entity === 'fruit') for (const b of [1, 2, 3]) out.push(formatNum(fruitBatchQty(r, b)) || '-');
    return out;
  });
  return { header, body };
}

export async function exportWorkbook(plan) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'مطبخ الخدمة';
  wb.created = new Date();
  for (const entity of ENTITY_KEYS) {
    const e = ENTITIES[entity];
    const ws = wb.addWorksheet(FLAT_SHEETS[entity], { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    const { header, body } = exportRows(entity, plan);
    ws.addRow(header);
    body.forEach((r) => ws.addRow(r));
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
    head.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    header.forEach((h, i) => {
      const f = e.fields.find((x) => x.label === h);
      ws.getColumn(i + 1).width = h === ID_COL || h === DAY_ID_COL ? 12 : f ? Math.max(10, Math.round((f.w || 120) / 7)) : 16;
    });
    ws.eachRow((row, n) => {
      if (n === 1) return;
      row.alignment = { vertical: 'top', wrapText: true };
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function exportCsv(entity, plan) {
  const { header, body } = exportRows(entity, plan);
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel opens the Arabic text as UTF-8.
  return '﻿' + [header, ...body].map((r) => r.map(esc).join(',')).join('\r\n');
}

export { FLAT_SHEETS };
