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

let db = globalThis.__mwkDb;
if (!db) {
  db = new Database(dbPath);
  // Wait (instead of throwing SQLITE_BUSY) when another process holds the write
  // lock — matters during `next build`, where parallel workers each open the DB.
  db.pragma('busy_timeout = 10000');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  globalThis.__mwkDb = db;
}

db.exec(`
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
`);

const usersCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (usersCount === 0) {
  try {
    const hash = bcrypt.hashSync('Mawkab1384', 10);
    db.prepare('INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(
      crypto.randomUUID(),
      'مدير الموقع',
      'admin',
      hash,
      'admin'
    );
  } catch {
    // another process seeded the admin concurrently
  }
}

export default db;
