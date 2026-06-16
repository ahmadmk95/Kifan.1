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
  date   TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0
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

CREATE TABLE IF NOT EXISTS ratings (
  id         TEXT PRIMARY KEY,
  member_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL REFERENCES users(id),
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS spotlight (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL REFERENCES users(id),
  note        TEXT NOT NULL DEFAULT '',
  set_by      TEXT NOT NULL REFERENCES users(id),
  cheer_count INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

try {
  db.exec('ALTER TABLE nights ADD COLUMN active INTEGER NOT NULL DEFAULT 0');
} catch {
  // column already exists
}

try {
  db.exec('ALTER TABLE committees ADD COLUMN supervisor_id TEXT REFERENCES users(id) ON DELETE SET NULL');
} catch {
  // column already exists
}

try {
  const usersCheck = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (usersCheck && !usersCheck.sql.includes('committee_supervisor')) {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      DROP TABLE IF EXISTS users_new;
      CREATE TABLE users_new (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        username      TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL CHECK (role IN ('supervisor','committee_supervisor','servant')),
        title         TEXT NOT NULL DEFAULT '',
        committee_id  TEXT REFERENCES committees(id) ON DELETE SET NULL,
        status        TEXT NOT NULL CHECK (status IN ('pending','active')),
        initials      TEXT NOT NULL DEFAULT '',
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO users_new SELECT * FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `);
    db.pragma('foreign_keys = ON');
  }
} catch {
  db.pragma('foreign_keys = ON');
}

const hasActive = db.prepare('SELECT COUNT(*) as n FROM nights WHERE active = 1').get();
if (hasActive && hasActive.n === 0) {
  const first = db.prepare('SELECT id FROM nights ORDER BY number LIMIT 1').get();
  if (first) db.prepare('UPDATE nights SET active = 1 WHERE id = ?').run(first.id);
}

export default db;
