-- Arbaeen plan schema (SQLite). Created automatically by lib/plan/store.js on startup;
-- this file is for reference only — there is no manual migration step.

CREATE TABLE plan_audit (
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

CREATE TABLE plan_day_notes (
  id         TEXT PRIMARY KEY,
  sort       REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  day_id TEXT NOT NULL, text TEXT NOT NULL DEFAULT '', owner TEXT, status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE plan_days (
  id         TEXT PRIMARY KEY,
  sort       REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  day_no INTEGER, hijri TEXT, gregorian TEXT, headcount INTEGER, title TEXT
);

CREATE TABLE plan_external (
  id         TEXT PRIMARY KEY,
  sort       REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  day_id TEXT NOT NULL, meal TEXT NOT NULL DEFAULT '', main_qty TEXT, rice_qty TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE plan_fruit (
  id         TEXT PRIMARY KEY,
  sort       REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  item TEXT NOT NULL DEFAULT '', total_qty REAL, unit TEXT, perishable INTEGER NOT NULL DEFAULT 0,
  notes TEXT, status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE plan_meal_items (
  id         TEXT PRIMARY KEY,
  sort       REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  day_id TEXT NOT NULL, meal TEXT NOT NULL DEFAULT 'lunch', item TEXT NOT NULL DEFAULT '',
  qty TEXT, method TEXT, cook TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'pending',
  category TEXT NOT NULL DEFAULT ''
);

CREATE TABLE plan_snapshots (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  kind       TEXT NOT NULL,          -- auto | manual | pre-restore | pre-import
  user_name  TEXT,
  note       TEXT,
  counts     TEXT,
  hash       TEXT,
  data       BLOB NOT NULL
);

CREATE TABLE plan_supplies (
  id         TEXT PRIMARY KEY,
  sort       REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  list TEXT NOT NULL DEFAULT 'food', supplier TEXT, grp TEXT, item TEXT NOT NULL DEFAULT '',
  price TEXT, unit TEXT, qty TEXT, notes TEXT, available TEXT, status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE plan_tasks (
  id         TEXT PRIMARY KEY,
  sort       REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  num TEXT, date TEXT, priority TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '',
  section TEXT, deadline TEXT, status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE plan_veg (
  id         TEXT PRIMARY KEY,
  sort       REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  batch INTEGER NOT NULL DEFAULT 1, item TEXT NOT NULL DEFAULT '', price TEXT, qty TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX idx_plan_audit_rec ON plan_audit(entity, record_id);

CREATE INDEX idx_plan_ext_day ON plan_external(day_id);

CREATE INDEX idx_plan_meal_day ON plan_meal_items(day_id);

CREATE INDEX idx_plan_note_day ON plan_day_notes(day_id);

-- users table (existing) — columns added for the plan: plan_edit, failed_logins, locked_until
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','member')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
, status TEXT NOT NULL DEFAULT 'active', access TEXT, can_prepare INTEGER NOT NULL DEFAULT 0, plan_edit INTEGER NOT NULL DEFAULT 0, failed_logins INTEGER NOT NULL DEFAULT 0, locked_until TEXT);
