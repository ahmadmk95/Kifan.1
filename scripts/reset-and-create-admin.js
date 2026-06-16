const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'kifan.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS committees (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  color TEXT NOT NULL,
  soft  TEXT NOT NULL,
  sort  INTEGER NOT NULL DEFAULT 0
);
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
`);

try {
  db.exec('ALTER TABLE nights ADD COLUMN active INTEGER NOT NULL DEFAULT 0');
} catch {
  // column already exists
}

// full wipe of all data
db.exec('DELETE FROM comments; DELETE FROM tasks; DELETE FROM nights; DELETE FROM users; DELETE FROM committees;');

// recreate the 10 Muharram nights, night 3 active by default (matches scripts/seed.js convention)
const arDigits = { 0: '٠', 1: '١', 2: '٢', 3: '٣', 4: '٤', 5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩' };
const toAr = (v) => String(v).replace(/[0-9]/g, (d) => arDigits[d]);

const ACTIVE_NIGHT_NUMBER = 3;
const insertNight = db.prepare('INSERT INTO nights (id, number, hijri, greg, date, active) VALUES (?, ?, ?, ?, ?, ?)');
for (let n = 1; n <= 10; n++) {
  const hijri = n === 10 ? 'ليلة عاشوراء ١٤٤٨ هـ' : `ليلة ${toAr(n)} محرم ١٤٤٨ هـ`;
  insertNight.run('night-' + n, n, hijri, 'الموافق ١٨ يونيو ٢٠٢٦', '2026-06-18', n === ACTIVE_NIGHT_NUMBER ? 1 : 0);
}

// create the one real supervisor account
const id = crypto.randomUUID();
const hash = bcrypt.hashSync('BTalameer28', 10);
db.prepare(
  'INSERT INTO users (id, name, username, password_hash, role, title, committee_id, status, initials) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)'
).run(id, 'بدرية طه الأمير', 'BTAlameer', hash, 'supervisor', 'خادمة الحسين', 'active', 'ب');

console.log('Reset complete. All demo data wiped.');
console.log('Created supervisor account: BTAlameer (password set as provided)');
console.log('Committees and tasks are empty - create them from the supervisor dashboard.');
