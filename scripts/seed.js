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

// wipe existing data for a clean reseed
db.exec('DELETE FROM comments; DELETE FROM tasks; DELETE FROM nights; DELETE FROM users; DELETE FROM committees;');

const COMMITTEES = [
  { id: 'reception', name: 'الاستقبال', color: '#BE9A3E', soft: '#F4EBD2', sort: 0 },
  { id: 'hospitality', name: 'الضيافة', color: '#3F7A52', soft: '#E2EFE6', sort: 1 },
  { id: 'majlis', name: 'المجلس', color: '#9E1B32', soft: '#F6E2E5', sort: 2 },
  { id: 'order', name: 'التنظيم', color: '#4A6072', soft: '#E5EAEF', sort: 3 },
  { id: 'media', name: 'الإعلام', color: '#6B4E86', soft: '#ECE5F2', sort: 4 },
];

const insertCommittee = db.prepare('INSERT INTO committees (id, name, color, soft, sort) VALUES (?, ?, ?, ?, ?)');
COMMITTEES.forEach((c) => insertCommittee.run(c.id, c.name, c.color, c.soft, c.sort));

const hash = bcrypt.hashSync('1234', 10);
const USERS = [
  { id: 'sup', name: 'فاطمة العلي', username: 'fatima', role: 'supervisor', title: 'خادمة الحسين', committee_id: null, status: 'active', initials: 'ف' },
  { id: 'm1', name: 'زهراء الحسين', username: 'zahra', role: 'servant', title: 'خادمة الاستقبال', committee_id: 'reception', status: 'active', initials: 'ز' },
  { id: 'm2', name: 'مريم عبدالله', username: 'maryam', role: 'servant', title: 'خادمة الضيافة', committee_id: 'hospitality', status: 'active', initials: 'م' },
  { id: 'm3', name: 'بتول أحمد', username: 'batool', role: 'servant', title: 'خادمة المجلس', committee_id: 'majlis', status: 'active', initials: 'ب' },
  { id: 'm4', name: 'رقية محمد', username: 'ruqaya', role: 'servant', title: 'خادمة التنظيم', committee_id: 'order', status: 'active', initials: 'ر' },
  { id: 'm5', name: 'سارة جاسم', username: 'sara', role: 'servant', title: 'خادمة الإعلام', committee_id: 'media', status: 'active', initials: 'س' },
  { id: 'p1', name: 'زينب العلي', username: 'zainab', role: 'servant', title: '', committee_id: null, status: 'pending', initials: 'ز' },
];

const insertUser = db.prepare(
  'INSERT INTO users (id, name, username, password_hash, role, title, committee_id, status, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
USERS.forEach((u) => insertUser.run(u.id, u.name, u.username, hash, u.role, u.title, u.committee_id, u.status, u.initials));

const arDigits = { 0: '٠', 1: '١', 2: '٢', 3: '٣', 4: '٤', 5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩' };
const toAr = (v) => String(v).replace(/[0-9]/g, (d) => arDigits[d]);

const insertNight = db.prepare('INSERT INTO nights (id, number, hijri, greg, date) VALUES (?, ?, ?, ?, ?)');
for (let n = 1; n <= 10; n++) {
  const hijri = n === 10 ? 'ليلة عاشوراء ١٤٤٨ هـ' : `ليلة ${toAr(n)} محرم ١٤٤٨ هـ`;
  insertNight.run('night-' + n, n, hijri, 'الموافق ١٨ يونيو ٢٠٢٦', '2026-06-18');
}

const ACTIVE_NIGHT_ID = 'night-3';
const TASKS = [
  { id: 't1', committee_id: 'reception', assignee_id: 'm1', title: 'فتح الأبواب وتجهيز المدخل', time: '5:30 م', place: 'المدخل الرئيسي', note: 'التأكد من الإنارة' },
  { id: 't2', committee_id: 'reception', assignee_id: 'm1', title: 'استقبال الحاضرات وتوزيع الكتيّبات', time: '6:00 م', place: 'الصالة', note: null },
  { id: 't3', committee_id: 'reception', assignee_id: 'm1', title: 'تنظيم مواقف السيارات للأخوات', time: '6:15 م', place: 'الساحة الخارجية', note: null },
  { id: 't4', committee_id: 'hospitality', assignee_id: 'm2', title: 'تجهيز الشاي والقهوة', time: '5:45 م', place: 'المطبخ', note: 'كميات إضافية لعاشوراء' },
  { id: 't5', committee_id: 'hospitality', assignee_id: 'm2', title: 'استلام النذور وتوزيعها', time: '7:00 م', place: 'قسم النذور', note: null },
  { id: 't6', committee_id: 'hospitality', assignee_id: 'm2', title: 'توزيع الماء على الصفوف', time: '8:30 م', place: 'الصالة', note: null },
  { id: 't7', committee_id: 'majlis', assignee_id: 'm3', title: 'تجهيز المنبر والمصاحف', time: '6:30 م', place: 'صدر المجلس', note: null },
  { id: 't8', committee_id: 'majlis', assignee_id: 'm3', title: 'فحص الصوتيات والميكروفون', time: '6:45 م', place: 'صدر المجلس', note: 'التنسيق مع قسم الصوت' },
  { id: 't9', committee_id: 'majlis', assignee_id: 'm3', title: 'تنظيم اللطم وبرنامج الرثاء', time: '8:45 م', place: 'الصالة', note: null },
  { id: 't10', committee_id: 'order', assignee_id: 'm4', title: 'فرش السجاد وترتيب الصفوف', time: '5:00 م', place: 'الصالة', note: null },
  { id: 't11', committee_id: 'order', assignee_id: 'm4', title: 'تخصيص مكان للأمهات والأطفال', time: '6:00 م', place: 'الجناح الجانبي', note: null },
  { id: 't12', committee_id: 'order', assignee_id: 'm4', title: 'نظافة الصالة بعد انتهاء المجلس', time: '9:30 م', place: 'الصالة', note: null },
  { id: 't13', committee_id: 'media', assignee_id: 'm5', title: 'نشر جدول الليلة في المجموعة', time: '4:00 م', place: 'عن بُعد', note: null },
  { id: 't14', committee_id: 'media', assignee_id: 'm5', title: 'تصوير أجواء المجلس', time: '8:00 م', place: 'الصالة', note: 'مراعاة الخصوصية' },
];

const insertTask = db.prepare(
  'INSERT INTO tasks (id, night_id, committee_id, assignee_id, title, time, place, note, done) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)'
);
TASKS.forEach((t) => insertTask.run(t.id, ACTIVE_NIGHT_ID, t.committee_id, t.assignee_id, t.title, t.time, t.place, t.note));

const COMMENTS = [
  { id: 'c1', task_id: 't4', author_id: 'm2', text: 'نحتاج علبتي شاي إضافيتين من المخزن.' },
  { id: 'c2', task_id: 't8', author_id: 'm3', text: 'الميكروفون الثاني يحتاج بطارية جديدة.' },
];
const insertComment = db.prepare('INSERT INTO comments (id, task_id, author_id, text) VALUES (?, ?, ?, ?)');
COMMENTS.forEach((c) => insertComment.run(c.id, c.task_id, c.author_id, c.text));

console.log('Seed complete. Active night id:', ACTIVE_NIGHT_ID);
console.log('Login credentials (password for all: 1234):');
USERS.forEach((u) => console.log(`  ${u.username} (${u.role}, ${u.status}) — ${u.name}`));
