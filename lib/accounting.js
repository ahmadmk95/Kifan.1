import crypto from 'crypto';
import db from './db';

export const CURRENCIES = ['USD', 'IQD', 'KWD'];

// Rates are stored as "how many units == $100". USD is always 100.
export function getRates() {
  const rows = db.prepare('SELECT currency, per_100_usd FROM fx_rates').all();
  const map = { USD: 100 };
  for (const r of rows) map[r.currency] = r.per_100_usd;
  return map;
}

export function toUsd(amount, currency, rates) {
  const per100 = rates[currency];
  if (!per100 || per100 <= 0) return 0;
  return (Number(amount) * 100) / per100;
}

export function listCategories() {
  return db.prepare('SELECT id, name FROM purchase_categories ORDER BY name COLLATE NOCASE').all();
}

export function listProfiles() {
  return db.prepare('SELECT id, name FROM acc_profiles WHERE archived = 0 ORDER BY sort, created_at').all();
}

// Archived (removed) books — data kept, hidden from the normal list.
export function listArchivedProfiles() {
  return db.prepare(
    `SELECT p.id, p.name, p.archived_at,
       (SELECT COUNT(*) FROM acc_transactions t WHERE t.profile_id = p.id) AS tx_count
     FROM acc_profiles p WHERE p.archived = 1 ORDER BY p.archived_at DESC`
  ).all();
}

// Soft-delete a book: it moves to the archive with its data intact.
export function archiveProfile(id) {
  const p = db.prepare('SELECT * FROM acc_profiles WHERE id = ? AND archived = 0').get(id);
  if (!p) { const e = new Error('الحساب غير موجود'); e.status = 404; throw e; }
  const active = db.prepare('SELECT COUNT(*) AS n FROM acc_profiles WHERE archived = 0').get().n;
  if (active <= 1) { const e = new Error('لا يمكن أرشفة الحساب الوحيد المتبقّي'); e.status = 400; throw e; }
  db.prepare("UPDATE acc_profiles SET archived = 1, archived_at = datetime('now') WHERE id = ?").run(id);
  return { id };
}

// Rename an account book (must stay unique among all books).
export function renameProfile(id, name) {
  const clean = String(name || '').trim().slice(0, 80);
  if (!clean) { const e = new Error('اسم الحساب مطلوب'); e.status = 400; throw e; }
  const p = db.prepare('SELECT * FROM acc_profiles WHERE id = ?').get(id);
  if (!p) { const e = new Error('الحساب غير موجود'); e.status = 404; throw e; }
  const dup = db.prepare('SELECT id FROM acc_profiles WHERE name = ? COLLATE NOCASE AND id != ?').get(clean, id);
  if (dup) { const e = new Error('يوجد حساب بهذا الاسم'); e.status = 409; throw e; }
  db.prepare('UPDATE acc_profiles SET name = ? WHERE id = ?').run(clean, id);
  return { id, name: clean };
}

// Bring an archived book back into the active list.
export function restoreProfile(id) {
  const p = db.prepare('SELECT * FROM acc_profiles WHERE id = ? AND archived = 1').get(id);
  if (!p) { const e = new Error('الحساب غير موجود في الأرشيف'); e.status = 404; throw e; }
  const dup = db.prepare('SELECT id FROM acc_profiles WHERE archived = 0 AND name = ? COLLATE NOCASE').get(p.name);
  if (dup) { const e = new Error('يوجد حساب نشط بنفس الاسم'); e.status = 409; throw e; }
  db.prepare('UPDATE acc_profiles SET archived = 0, archived_at = NULL WHERE id = ?').run(id);
  return { id };
}

// Create a new account book. Returns { id } or throws on a duplicate name.
export function createProfile(name) {
  const clean = String(name || '').trim().slice(0, 80);
  if (!clean) { const e = new Error('اسم الحساب مطلوب'); e.status = 400; throw e; }
  const dup = db.prepare('SELECT id FROM acc_profiles WHERE name = ? COLLATE NOCASE').get(clean);
  if (dup) { const e = new Error('يوجد حساب بهذا الاسم'); e.status = 409; throw e; }
  const id = crypto.randomUUID();
  const nextSort = (db.prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM acc_profiles').get().m || 0) + 1;
  db.prepare('INSERT INTO acc_profiles (id, name, sort) VALUES (?, ?, ?)').run(id, clean, nextSort);
  return { id, name: clean };
}

// Resolve a requested profile id to a valid one (falls back to the main book).
export function resolveProfileId(profileId) {
  const profiles = listProfiles();
  const found = profiles.find((p) => p.id === profileId);
  return (found || profiles[0] || null)?.id || null;
}

export function getTransaction(id) {
  const t = db
    .prepare(
      `SELECT t.*, c.name AS category_name
       FROM acc_transactions t
       LEFT JOIN purchase_categories c ON c.id = t.category_id
       WHERE t.id = ?`
    )
    .get(id);
  if (!t) return null;
  const rates = getRates();
  const images = db
    .prepare('SELECT id, url FROM acc_transaction_images WHERE transaction_id = ? ORDER BY created_at')
    .all(id);
  return { ...t, amount_usd: toUsd(t.amount, t.currency, rates), images };
}

// Distinct previously-entered values, most-used first, for input autocomplete.
export function listSuggestions(profileId) {
  const rows = db.prepare('SELECT item, party, description FROM acc_transactions WHERE profile_id = ?').all(profileId);
  const collect = (key) => {
    const counts = new Map();
    for (const r of rows) {
      const v = (r[key] || '').trim();
      if (v) counts.set(v, (counts.get(v) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]).slice(0, 200);
  };
  return { items: collect('item'), parties: collect('party'), descriptions: collect('description') };
}

// Current cash balance (donations − PAID purchases, in USD) for one account
// book. Pending (unpaid) purchases are obligations, not yet spent, so they do
// not reduce the balance.
export function getBalanceUsd(profileId, rates = getRates()) {
  const rows = db.prepare('SELECT type, amount, currency, pending FROM acc_transactions WHERE profile_id = ?').all(profileId);
  let bal = 0;
  for (const r of rows) {
    if (r.pending) continue; // uncollected donations / unpaid purchases are not in hand yet
    const usd = toUsd(r.amount, r.currency, rates);
    bal += r.type === 'donation' ? usd : -usd;
  }
  return bal;
}

const RECON_TOLERANCE = 0.05; // ±5%

// Save one custody reconciliation check. Counted totals + recorded balance are
// computed server-side from the current rates so the record is trustworthy.
export function saveReconciliation(profileId, counts, note, userName) {
  const pid = resolveProfileId(profileId);
  if (!pid) { const e = new Error('لا يوجد حساب'); e.status = 400; throw e; }
  const rates = getRates();
  const usd = Math.max(0, Number(counts?.USD) || 0);
  const iqd = Math.max(0, Number(counts?.IQD) || 0);
  const kwd = Math.max(0, Number(counts?.KWD) || 0);
  const countedUsd = usd + toUsd(iqd, 'IQD', rates) + toUsd(kwd, 'KWD', rates);
  const systemUsd = getBalanceUsd(pid, rates);
  const base = Math.abs(systemUsd);
  const within = base > 0 ? Math.abs(countedUsd - systemUsd) / base <= RECON_TOLERANCE : Math.abs(countedUsd - systemUsd) < 0.01;
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO acc_reconciliations
     (id, profile_id, usd_amount, iqd_amount, kwd_amount, counted_usd, system_usd, within_tol, note, checked_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, pid, usd, iqd, kwd, countedUsd, systemUsd, within ? 1 : 0, note ? String(note).trim().slice(0, 300) : null, userName || null);
  return db.prepare('SELECT * FROM acc_reconciliations WHERE id = ?').get(id);
}

export function listReconciliations(profileId, limit = 50) {
  const pid = resolveProfileId(profileId);
  if (!pid) return [];
  return db.prepare('SELECT * FROM acc_reconciliations WHERE profile_id = ? ORDER BY created_at DESC LIMIT ?').all(pid, limit);
}

export function getAccounting(profileId) {
  const profiles = listProfiles();
  const pid = resolveProfileId(profileId);
  const rates = getRates();
  const categories = db.prepare('SELECT id, name FROM purchase_categories ORDER BY name COLLATE NOCASE').all();

  const txRows = db
    .prepare(
      `SELECT t.*, c.name AS category_name
       FROM acc_transactions t
       LEFT JOIN purchase_categories c ON c.id = t.category_id
       WHERE t.profile_id = ?
       ORDER BY t.occurred_on DESC, t.created_at DESC`
    )
    .all(pid);

  const imgs = db.prepare('SELECT id, transaction_id, url FROM acc_transaction_images').all();
  const imgByTx = {};
  for (const im of imgs) (imgByTx[im.transaction_id] ||= []).push({ id: im.id, url: im.url });

  let donationsUsd = 0;
  let purchasesUsd = 0; // paid purchases only
  let pendingUsd = 0;   // unpaid obligations (purchases)
  let pendingCount = 0;
  let pledgedUsd = 0;   // pledged but not-yet-collected donations
  let pledgedCount = 0;
  const byCategory = {};
  // Native (un-converted) totals, one bucket per currency actually used.
  const byCurrency = {};
  const ccy = (c) => (byCurrency[c] ||= { currency: c, donations: 0, purchases: 0, pending: 0, pledged: 0 });

  const transactions = txRows.map((t) => {
    const usd = toUsd(t.amount, t.currency, rates);
    const native = Number(t.amount) || 0;
    if (t.type === 'donation') {
      if (t.pending) {
        pledgedUsd += usd;
        pledgedCount += 1;
        ccy(t.currency).pledged += native;
      } else {
        donationsUsd += usd;
        ccy(t.currency).donations += native;
      }
    } else if (t.pending) {
      pendingUsd += usd;
      pendingCount += 1;
      ccy(t.currency).pending += native;
    } else {
      purchasesUsd += usd;
      ccy(t.currency).purchases += native;
      const key = t.category_name || 'غير مصنّف';
      byCategory[key] = (byCategory[key] || 0) + usd;
    }
    return { ...t, amount_usd: usd, images: imgByTx[t.id] || [] };
  });

  const balanceUsd = donationsUsd - purchasesUsd;

  return {
    profiles,
    archived_profiles: listArchivedProfiles(),
    active_profile: pid,
    rates,
    categories,
    transactions,
    totals: {
      donations_usd: donationsUsd,
      purchases_usd: purchasesUsd,
      pending_usd: pendingUsd,
      pending_count: pendingCount,
      pledged_usd: pledgedUsd,
      pledged_count: pledgedCount,
      balance_usd: balanceUsd,
      projected_usd: balanceUsd - pendingUsd, // what's left after paying obligations
    },
    by_category: Object.entries(byCategory)
      .map(([name, usd]) => ({ name, usd }))
      .sort((a, b) => b.usd - a.usd),
    by_currency: CURRENCIES
      .filter((c) => byCurrency[c])
      .map((c) => {
        const b = byCurrency[c];
        const balance = b.donations - b.purchases;
        return { currency: c, donations: b.donations, purchases: b.purchases, pending: b.pending, pledged: b.pledged, balance, projected: balance - b.pending };
      }),
    suggestions: listSuggestions(pid),
  };
}
