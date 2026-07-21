import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

let dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
try {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
} catch {
  // configured DATA_DIR isn't mountable yet (e.g. during build, before the disk is attached)
  dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

export const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dbPath = path.join(dataDir, 'mawkab.sqlite');

function sleepMs(ms) {
  // Synchronous sleep without burning CPU — used to back off on a locked DB.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

let db = globalThis.__mwkDb;
if (!db) {
  db = new Database(dbPath);
  // Wait (instead of throwing SQLITE_BUSY) when another process holds the write
  // lock — matters during `next build`, where parallel workers each open the DB.
  db.pragma('busy_timeout = 15000');
  try {
    db.pragma('journal_mode = WAL');
  } catch {
    // Another build worker is switching journal mode concurrently; default is fine.
  }
  db.pragma('foreign_keys = ON');
  globalThis.__mwkDb = db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','member')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS committees (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  sort         INTEGER NOT NULL DEFAULT 0,
  visibility   TEXT NOT NULL CHECK (visibility IN ('public','private','both')),
  content_html TEXT NOT NULL DEFAULT '',
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS page_views (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  committee_id TEXT,                 -- NULL = home / site visit
  slug         TEXT,                 -- committee slug snapshot (nullable)
  visitor_id   TEXT NOT NULL,        -- first-party cookie id
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pv_committee ON page_views(committee_id);
CREATE INDEX IF NOT EXISTS idx_pv_visitor ON page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_pv_created ON page_views(created_at);

-- Accounting ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fx_rates (
  currency    TEXT PRIMARY KEY,     -- 'USD' | 'IQD' | 'KWD'
  per_100_usd REAL NOT NULL         -- how many units of this currency equal $100
);

CREATE TABLE IF NOT EXISTS purchase_categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS acc_transactions (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('donation','purchase')),
  amount      REAL NOT NULL,        -- amount in its original currency
  currency    TEXT NOT NULL,        -- 'USD' | 'IQD' | 'KWD'
  category_id TEXT,                 -- purchases only
  party       TEXT,                 -- donor (تبرع) or vendor (مشترى)
  description TEXT,
  occurred_on TEXT NOT NULL DEFAULT (date('now')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS acc_transaction_images (
  id             TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  url            TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_acc_tx_type ON acc_transactions(type);
CREATE INDEX IF NOT EXISTS idx_acc_img_tx ON acc_transaction_images(transaction_id);

-- Central fridge inventory (ثلاجة) --------------------------------------
CREATE TABLE IF NOT EXISTS fridge_items (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  location   TEXT NOT NULL DEFAULT 'fridge', -- branch: 'fridge' | 'freezer' | 'external'
  unit       TEXT,                          -- كيلو / قطعة / كرتون ... (nullable)
  quantity   REAL NOT NULL DEFAULT 0,       -- current on-hand, kept in sync with movements
  min_qty    REAL,                          -- low-stock threshold (nullable)
  flagged    INTEGER NOT NULL DEFAULT 0,    -- manually added to the low-stock list
  image_url  TEXT,                          -- optional photo (/api/uploads/…)
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fridge_categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fridge_movements (
  id         TEXT PRIMARY KEY,
  item_id    TEXT NOT NULL,
  delta      REAL NOT NULL,                 -- +added (إدخال) / -removed (إخراج)
  balance    REAL NOT NULL,                 -- resulting on-hand after this movement
  reason     TEXT,                          -- optional note for this movement
  user_name  TEXT,                          -- who recorded it (snapshot)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fridge_mov_item ON fridge_movements(item_id);
`;

function ensureColumn(table, col, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === col)) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    } catch (e) {
      if (!/duplicate column/i.test(e.message)) throw e; // a concurrent worker added it
    }
  }
}

function initSchema() {
  db.exec(SCHEMA);

  // Migrations for tables that predate a column.
  ensureColumn('acc_transactions', 'item', 'item TEXT'); // purchase item name
  ensureColumn('users', 'status', "status TEXT NOT NULL DEFAULT 'active'"); // 'active' | 'pending'
  ensureColumn('users', 'access', 'access TEXT'); // members: 'committees' | 'accounting'
  ensureColumn('fridge_items', 'location', "location TEXT NOT NULL DEFAULT 'fridge'"); // branch
  ensureColumn('fridge_items', 'category_id', 'category_id TEXT'); // fridge item category
  ensureColumn('fridge_items', 'flagged', 'flagged INTEGER NOT NULL DEFAULT 0'); // manual low-stock flag

  const usersCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (usersCount === 0) {
    const hash = bcrypt.hashSync('Mawkab1384', 10);
    // OR IGNORE: if a concurrent build worker already inserted 'admin', skip quietly.
    db.prepare('INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(
      crypto.randomUUID(), 'مدير الموقع', 'admin', hash, 'admin'
    );
  }

  const fxCount = db.prepare('SELECT COUNT(*) AS n FROM fx_rates').get().n;
  if (fxCount === 0) {
    const ins = db.prepare('INSERT OR IGNORE INTO fx_rates (currency, per_100_usd) VALUES (?, ?)');
    ins.run('USD', 100);
    ins.run('IQD', 131000);
    ins.run('KWD', 30.6);
  }
}

// During `next build`, several worker processes initialise the DB at once. Retry
// on a transient lock; if we still lose the race, another worker already created
// the schema, so it's safe to continue.
if (!globalThis.__mwkInit) {
  for (let attempt = 0; ; attempt++) {
    try {
      initSchema();
      break;
    } catch (e) {
      if (e && e.code === 'SQLITE_BUSY' && attempt < 40) {
        sleepMs(200);
        continue;
      }
      if (e && e.code === 'SQLITE_BUSY') break; // another worker handled it
      throw e;
    }
  }
  globalThis.__mwkInit = true;
}

export default db;
