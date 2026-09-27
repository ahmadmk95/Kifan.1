// Server-side data layer for the Arbaeen plan: one master dataset in SQLite,
// every write recorded in plan_audit (who, when, record, field, old → new),
// soft deletes (Trash), per-record version history, and whole-plan snapshots.
import crypto from 'crypto';
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import db, { dataDir } from '../db';
import { ENTITIES, ENTITY_KEYS, STATUS, fieldsOf } from './model';

const COMMON = `
  id         TEXT PRIMARY KEY,
  sort       REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))`;

db.exec(`
CREATE TABLE IF NOT EXISTS plan_tasks (${COMMON},
  num TEXT, date TEXT, priority TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '',
  section TEXT, deadline TEXT, status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS plan_days (${COMMON},
  day_no INTEGER, hijri TEXT, gregorian TEXT, headcount INTEGER, title TEXT
);
CREATE TABLE IF NOT EXISTS plan_meal_items (${COMMON},
  day_id TEXT NOT NULL, meal TEXT NOT NULL DEFAULT 'lunch', item TEXT NOT NULL DEFAULT '',
  qty TEXT, method TEXT, cook TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'pending',
  category TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_plan_meal_day ON plan_meal_items(day_id);
CREATE TABLE IF NOT EXISTS plan_day_notes (${COMMON},
  day_id TEXT NOT NULL, text TEXT NOT NULL DEFAULT '', owner TEXT, status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_plan_note_day ON plan_day_notes(day_id);
CREATE TABLE IF NOT EXISTS plan_external (${COMMON},
  day_id TEXT NOT NULL, meal TEXT NOT NULL DEFAULT '', main_qty TEXT, rice_qty TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_plan_ext_day ON plan_external(day_id);
CREATE TABLE IF NOT EXISTS plan_fruit (${COMMON},
  item TEXT NOT NULL DEFAULT '', total_qty REAL, unit TEXT, perishable INTEGER NOT NULL DEFAULT 0,
  notes TEXT, status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS plan_veg (${COMMON},
  batch INTEGER NOT NULL DEFAULT 1, item TEXT NOT NULL DEFAULT '', price TEXT, qty TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS plan_supplies (${COMMON},
  list TEXT NOT NULL DEFAULT 'food', supplier TEXT, grp TEXT, item TEXT NOT NULL DEFAULT '',
  price TEXT, unit TEXT, qty TEXT, notes TEXT, available TEXT, status TEXT NOT NULL DEFAULT 'pending'
);

-- Every create / edit / delete / restore. One row per changed field; rows of
-- the same save share change_id so a save is one "version".
CREATE TABLE IF NOT EXISTS plan_audit (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  change_id  TEXT NOT NULL,
  at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  user_id    TEXT,
  user_name  TEXT,
  entity     TEXT NOT NULL,
  record_id  TEXT NOT NULL,
  action     TEXT NOT NULL,          -- create | update | delete | restore | import | snapshot
  field      TEXT,
  old_value  TEXT,
  new_value  TEXT,
  label      TEXT
);
CREATE INDEX IF NOT EXISTS idx_plan_audit_rec ON plan_audit(entity, record_id);

-- Whole-plan snapshots (gzip JSON of every plan table).
CREATE TABLE IF NOT EXISTS plan_snapshots (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  kind       TEXT NOT NULL,          -- auto | manual | pre-restore | pre-import
  user_name  TEXT,
  note       TEXT,
  counts     TEXT,
  hash       TEXT,
  data       BLOB NOT NULL
);
`);

const T = (entity) => {
  const e = ENTITIES[entity];
  if (!e) throw httpError(404, 'قسم غير معروف');
  return e;
};

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const who = (user) => ({ id: user?.id || null, name: user?.name || 'النظام' });

// ---------------------------------------------------------------- values

// Coerce an incoming value to the field's type; unknown select values fall
// back to the first option so the DB never holds junk.
function coerce(f, v) {
  if (f.type === 'number') {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(String(v).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (f.type === 'bool') return v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0;
  if (f.type === 'status') return STATUS.some((s) => s.v === v) ? v : 'pending';
  if (f.type === 'select') {
    const s = v === null || v === undefined ? '' : String(v);
    return f.options.some((o) => String(o.v) === s) ? (f.k === 'batch' ? Number(s) : s) : f.k === 'batch' ? 1 : String(f.options[0].v);
  }
  if (f.type === 'date') {
    const s = String(v ?? '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s ? s.slice(0, 40) : null;
  }
  const s = v === null || v === undefined ? '' : String(v);
  return s.trim().slice(0, 4000);
}

const asText = (v) => (v === null || v === undefined ? '' : String(v));

// ---------------------------------------------------------------- reads

function rows(table, where = '', args = []) {
  return db.prepare(`SELECT * FROM ${table} WHERE deleted_at IS NULL ${where} ORDER BY sort, created_at`).all(...args);
}

// The whole live plan, days with their meals/notes/external entries nested.
export function getPlan() {
  const days = rows('plan_days');
  const byDay = (table) => {
    const m = new Map();
    for (const r of rows(table)) {
      if (!m.has(r.day_id)) m.set(r.day_id, []);
      m.get(r.day_id).push(r);
    }
    return m;
  };
  const meals = byDay('plan_meal_items');
  const notes = byDay('plan_day_notes');
  const ext = byDay('plan_external');
  return {
    tasks: rows('plan_tasks'),
    days: days.map((d) => ({ ...d, items: meals.get(d.id) || [], notes: notes.get(d.id) || [], external: ext.get(d.id) || [] })),
    fruit: rows('plan_fruit'),
    veg: rows('plan_veg'),
    supplies: rows('plan_supplies'),
    version: dataVersion(),
  };
}

export function getDay(id) {
  const d = db.prepare('SELECT * FROM plan_days WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!d) return null;
  return {
    ...d,
    items: rows('plan_meal_items', 'AND day_id = ?', [id]),
    notes: rows('plan_day_notes', 'AND day_id = ?', [id]),
    external: rows('plan_external', 'AND day_id = ?', [id]),
  };
}

export function dayNeighbours(day) {
  const all = rows('plan_days');
  const i = all.findIndex((d) => d.id === day.id);
  return { prev: all[i - 1] || null, next: all[i + 1] || null, all };
}

// Changes whenever anything is written — pages poll it to refresh live.
export function dataVersion() {
  return db.prepare('SELECT COALESCE(MAX(id), 0) AS v FROM plan_audit').get().v;
}

// ---------------------------------------------------------------- writes

function audit(changeId, user, entity, recordId, action, field, oldV, newV, label) {
  const u = who(user);
  db.prepare(
    `INSERT INTO plan_audit (change_id, at, user_id, user_name, entity, record_id, action, field, old_value, new_value, label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(changeId, now(), u.id, u.name, entity, recordId, action, field, oldV, newV, label ? String(label).slice(0, 200) : null);
}

function getRow(entity, id) {
  return db.prepare(`SELECT * FROM ${T(entity).table} WHERE id = ?`).get(id);
}

function recordLabel(entity, row) {
  try {
    return T(entity).title(row) || '';
  } catch {
    return '';
  }
}

export const createRecord = db.transaction((entity, data, user) => {
  const e = T(entity);
  const id = crypto.randomUUID();
  const cols = ['id', 'sort', 'created_at', 'updated_at'];
  const maxSort = e.parent
    ? db.prepare(`SELECT COALESCE(MAX(sort), 0) AS s FROM ${e.table} WHERE ${e.parent} = ?`).get(data[e.parent])?.s
    : db.prepare(`SELECT COALESCE(MAX(sort), 0) AS s FROM ${e.table}`).get().s;
  const ts = now();
  const vals = [id, (maxSort || 0) + 1, ts, ts];
  if (e.parent) {
    const parent = db.prepare('SELECT id FROM plan_days WHERE id = ? AND deleted_at IS NULL').get(data[e.parent]);
    if (!parent) throw httpError(400, 'اليوم غير موجود');
    cols.push(e.parent);
    vals.push(data[e.parent]);
  }
  const rec = {};
  for (const f of e.fields) {
    let v = data[f.k];
    if (v === undefined) {
      if (f.type === 'status') v = 'pending';
      else if (f.type === 'select') v = f.options[0].v;
      else if (f.type === 'bool') v = 0;
      else v = f.type === 'number' || f.type === 'date' ? null : '';
    }
    if (entity === 'task' && f.k === 'num' && !data.num) {
      v = String(db.prepare('SELECT COUNT(*) AS n FROM plan_tasks WHERE deleted_at IS NULL').get().n + 1);
    }
    rec[f.k] = coerce(f, v);
    cols.push(f.k);
    vals.push(rec[f.k]);
  }
  db.prepare(`INSERT INTO ${e.table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...vals);
  const row = getRow(entity, id);
  audit(crypto.randomUUID(), user, entity, id, 'create', null, null, JSON.stringify(pick(entity, row)), recordLabel(entity, row));
  return row;
});

function pick(entity, row) {
  const out = {};
  for (const f of fieldsOf(entity)) out[f.k] = row[f.k];
  return out;
}

export const updateRecord = db.transaction((entity, id, patch, user, action = 'update') => {
  const e = T(entity);
  const row = getRow(entity, id);
  if (!row || row.deleted_at) throw httpError(404, 'السجل غير موجود أو محذوف');
  const changeId = crypto.randomUUID();
  const sets = [];
  const vals = [];
  for (const f of e.fields) {
    if (!(f.k in patch)) continue;
    const v = coerce(f, patch[f.k]);
    if (asText(v) === asText(row[f.k])) continue;
    sets.push(`${f.k} = ?`);
    vals.push(v);
    audit(changeId, user, entity, id, action, f.k, asText(row[f.k]), asText(v), recordLabel(entity, { ...row, [f.k]: v }));
  }
  if (!sets.length) return row;
  db.prepare(`UPDATE ${e.table} SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).run(...vals, now(), id);
  return getRow(entity, id);
});

export const deleteRecord = db.transaction((entity, id, user) => {
  const e = T(entity);
  const row = getRow(entity, id);
  if (!row || row.deleted_at) return;
  db.prepare(`UPDATE ${e.table} SET deleted_at = ? WHERE id = ?`).run(now(), id);
  audit(crypto.randomUUID(), user, entity, id, 'delete', null, JSON.stringify(pick(entity, row)), null, recordLabel(entity, row));
});

export const restoreRecord = db.transaction((entity, id, user) => {
  const e = T(entity);
  const row = getRow(entity, id);
  if (!row) throw httpError(404, 'السجل غير موجود');
  if (!row.deleted_at) return row;
  if (e.parent) {
    const parent = db.prepare('SELECT deleted_at FROM plan_days WHERE id = ?').get(row[e.parent]);
    if (!parent) throw httpError(400, 'اليوم الذي يتبع له هذا السجل لم يعد موجوداً');
    if (parent.deleted_at) throw httpError(400, 'استرجع اليوم الذي يتبع له هذا السجل أولاً');
  }
  db.prepare(`UPDATE ${e.table} SET deleted_at = NULL, updated_at = ? WHERE id = ?`).run(now(), id);
  audit(crypto.randomUUID(), user, entity, id, 'restore', null, null, null, recordLabel(entity, row));
  return getRow(entity, id);
});

// ---------------------------------------------------------------- history

// Versions of one record, newest first. Each version is the full record as it
// stood right after that change — rebuilt by walking the audit log backwards
// from the current row.
export function recordHistory(entity, id) {
  const row = getRow(entity, id);
  if (!row) throw httpError(404, 'السجل غير موجود');
  const entries = db
    .prepare('SELECT * FROM plan_audit WHERE entity = ? AND record_id = ? ORDER BY id DESC')
    .all(entity, id);
  const groups = [];
  for (const a of entries) {
    const g = groups[groups.length - 1];
    if (g && g.change_id === a.change_id) g.entries.push(a);
    else groups.push({ change_id: a.change_id, at: a.at, user_name: a.user_name, action: a.action, entries: [a] });
  }
  let state = pick(entity, row);
  const versions = [];
  groups.forEach((g, i) => {
    const changes = g.entries.filter((a) => a.field).map((a) => ({ field: a.field, old: a.old_value, new: a.new_value }));
    versions.push({ change_id: g.change_id, at: g.at, user_name: g.user_name, action: g.action, changes, state: { ...state }, current: i === 0 });
    // Step back to the state before this change.
    for (const c of changes) state[c.field] = c.old;
  });
  // Rows that arrived by import (or a backup restore) have no "create" entry —
  // offer their state before the first recorded change as the original.
  if (groups.length && groups[groups.length - 1].action !== 'create') {
    versions.push({ change_id: 'origin', at: row.created_at, user_name: null, action: 'origin', changes: [], state: { ...state }, current: false });
  }
  return { record: row, deleted: !!row.deleted_at, versions };
}

export const restoreVersion = db.transaction((entity, id, changeId, user) => {
  const { versions } = recordHistory(entity, id);
  const v = versions.find((x) => x.change_id === changeId);
  if (!v) throw httpError(404, 'النسخة غير موجودة');
  if (!['create', 'update', 'origin'].includes(v.action)) throw httpError(400, 'اختر نسخة تعديل أو إنشاء');
  const row = getRow(entity, id);
  if (row.deleted_at) restoreRecord(entity, id, user);
  return updateRecord(entity, id, v.state, user, 'update');
});

export function recentAudit({ limit = 200, before } = {}) {
  const args = [];
  let where = '';
  if (before) {
    where = 'WHERE id < ?';
    args.push(Number(before));
  }
  return db.prepare(`SELECT * FROM plan_audit ${where} ORDER BY id DESC LIMIT ?`).all(...args, Math.min(limit, 500));
}

// ---------------------------------------------------------------- trash

export function trash() {
  const out = [];
  const deletedDays = new Set(db.prepare('SELECT id FROM plan_days WHERE deleted_at IS NOT NULL').all().map((r) => r.id));
  const dayName = new Map(db.prepare('SELECT id, day_no, hijri FROM plan_days').all().map((d) => [d.id, `اليوم ${d.day_no ?? ''} (${d.hijri || ''})`]));
  for (const entity of ENTITY_KEYS) {
    const e = ENTITIES[entity];
    for (const r of db.prepare(`SELECT * FROM ${e.table} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`).all()) {
      // Children of a deleted day come back with the day — list the day only.
      if (e.parent && deletedDays.has(r[e.parent])) continue;
      out.push({
        entity,
        id: r.id,
        label: recordLabel(entity, r) || '—',
        where: e.parent ? dayName.get(r[e.parent]) || '' : '',
        deleted_at: r.deleted_at,
        by: db
          .prepare("SELECT user_name FROM plan_audit WHERE entity = ? AND record_id = ? AND action = 'delete' ORDER BY id DESC LIMIT 1")
          .get(entity, r.id)?.user_name,
      });
    }
  }
  return out.sort((a, b) => String(b.deleted_at).localeCompare(String(a.deleted_at)));
}

// ---------------------------------------------------------------- snapshots

// Every plan table, including soft-deleted rows (so Trash survives a restore).
export function dumpAll() {
  const out = {};
  for (const entity of ENTITY_KEYS) out[ENTITIES[entity].table] = db.prepare(`SELECT * FROM ${ENTITIES[entity].table} ORDER BY sort, created_at`).all();
  return out;
}

function countsOf(dump) {
  const live = (t) => (dump[t] || []).filter((r) => !r.deleted_at).length;
  return {
    days: live('plan_days'),
    items: live('plan_meal_items'),
    tasks: live('plan_tasks'),
    supplies: live('plan_supplies') + live('plan_fruit') + live('plan_veg'),
  };
}

export function createSnapshot(kind, user, note) {
  const dump = dumpAll();
  const json = JSON.stringify(dump);
  const hash = crypto.createHash('sha256').update(json).digest('hex');
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO plan_snapshots (id, created_at, kind, user_name, note, counts, hash, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, now(), kind, user?.name || 'تلقائي', note || null, JSON.stringify(countsOf(dump)), hash, zlib.gzipSync(json)
  );
  return { id, hash };
}

export function listSnapshots() {
  return db
    .prepare('SELECT id, created_at, kind, user_name, note, counts, length(data) AS size FROM plan_snapshots ORDER BY created_at DESC')
    .all()
    .map((s) => ({ ...s, counts: JSON.parse(s.counts || '{}') }));
}

export function readSnapshot(id) {
  const s = db.prepare('SELECT * FROM plan_snapshots WHERE id = ?').get(id);
  if (!s) throw httpError(404, 'النسخة الاحتياطية غير موجودة');
  return { ...s, dump: JSON.parse(zlib.gunzipSync(s.data).toString('utf8')) };
}

// Replace every plan table with `dump` (same shape as dumpAll). Unknown
// columns are ignored, so older snapshots still load after schema growth.
const writeDump = db.transaction((dump) => {
  for (const entity of ENTITY_KEYS) {
    const table = ENTITIES[entity].table;
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    db.prepare(`DELETE FROM ${table}`).run();
    for (const r of dump[table] || []) {
      const use = cols.filter((c) => c in r);
      db.prepare(`INSERT INTO ${table} (${use.join(',')}) VALUES (${use.map(() => '?').join(',')})`).run(...use.map((c) => r[c]));
    }
  }
});

export function restoreSnapshot(id, user) {
  const snap = readSnapshot(id);
  createSnapshot('pre-restore', user, 'نسخة تلقائية قبل الاسترجاع');
  writeDump(snap.dump);
  audit(crypto.randomUUID(), user, 'system', id, 'snapshot', null, null, null, `استرجاع نسخة ${snap.created_at}`);
  return countsOf(snap.dump);
}

function hasPlanData() {
  return ENTITY_KEYS.some((k) => db.prepare(`SELECT 1 FROM ${ENTITIES[k].table} LIMIT 1`).get());
}

export function replaceAll(dump, user, note) {
  if (hasPlanData()) createSnapshot('pre-import', user, 'نسخة تلقائية قبل الاستيراد');
  writeDump(dump);
  audit(crypto.randomUUID(), user, 'system', 'import', 'import', null, null, null, note || 'استيراد من Excel');
  return countsOf(dump);
}

// Once per calendar day (Baghdad time): snapshot the plan, and copy the whole
// SQLite database file to data/backups (last 14 kept) for disaster recovery.
// Runs lazily on the first plan request of the day, so it also works on hosts
// that sleep between visits.
export function ensureDailyBackup() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad' }).format(new Date());
  const last = db.prepare("SELECT value FROM app_meta WHERE key = 'plan_daily_backup'").get()?.value;
  if (last === today) return;
  // Nothing to back up until the plan has been loaded.
  if (!hasPlanData()) return;
  db.prepare("INSERT INTO app_meta (key, value) VALUES ('plan_daily_backup', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(today);
  try {
    createSnapshot('auto', null, `نسخة يومية ${today}`);
    // Automatic snapshots older than 60 days are pruned; manual ones are kept.
    db.prepare("DELETE FROM plan_snapshots WHERE kind IN ('auto','pre-restore','pre-import') AND created_at < ?").run(
      new Date(Date.now() - 60 * 864e5).toISOString()
    );
  } catch (e) {
    console.error('[plan] daily snapshot failed', e);
  }
  try {
    const dir = path.join(dataDir, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    db.backup(path.join(dir, `mawkab-${today}.sqlite`))
      .then(() => {
        const files = fs.readdirSync(dir).filter((f) => /^mawkab-\d{4}-\d{2}-\d{2}\.sqlite$/.test(f)).sort();
        for (const f of files.slice(0, Math.max(0, files.length - 14))) fs.unlinkSync(path.join(dir, f));
      })
      .catch((e) => console.error('[plan] database file backup failed', e));
  } catch (e) {
    console.error('[plan] database file backup failed', e);
  }
}

// A dump (snapshot / import) in the same nested shape as getPlan(), live rows only.
export function planFromDump(dump) {
  const live = (t) => (dump[t] || []).filter((r) => !r.deleted_at).sort((a, b) => a.sort - b.sort);
  const group = (t) => {
    const m = new Map();
    for (const r of live(t)) {
      if (!m.has(r.day_id)) m.set(r.day_id, []);
      m.get(r.day_id).push(r);
    }
    return m;
  };
  const meals = group('plan_meal_items');
  const notes = group('plan_day_notes');
  const ext = group('plan_external');
  return {
    tasks: live('plan_tasks'),
    days: live('plan_days').map((d) => ({ ...d, items: meals.get(d.id) || [], notes: notes.get(d.id) || [], external: ext.get(d.id) || [] })),
    fruit: live('plan_fruit'),
    veg: live('plan_veg'),
    supplies: live('plan_supplies'),
  };
}
