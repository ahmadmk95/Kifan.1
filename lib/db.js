import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'kifan.sqlite');

let db = globalThis.__kfnDb;
if (!db) {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  globalThis.__kfnDb = db;
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('supervisor','servant')),
  title         TEXT NOT NULL DEFAULT '',
  committee_id  TEXT REFERENCES committees(id) ON DELETE SET NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending','active')),
  initials      TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS committees (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  color TEXT NOT NULL,
  soft  TEXT NOT NULL,
  sort  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nights (
  id     TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  hijri  TEXT NOT NULL,
  greg   TEXT NOT NULL,
  date   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,
  night_id     TEXT NOT NULL REFERENCES nights(id),
  committee_id TEXT NOT NULL REFERENCES committees(id),
  assignee_id  TEXT NOT NULL REFERENCES users(id),
  title        TEXT NOT NULL,
  time         TEXT NOT NULL,
  place        TEXT NOT NULL,
  note         TEXT,
  done         INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL REFERENCES users(id),
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export default db;
