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
  return db.prepare('SELECT id, name FROM acc_profiles ORDER BY sort, created_at').all();
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
  let purchasesUsd = 0;
  const byCategory = {};

  const transactions = txRows.map((t) => {
    const usd = toUsd(t.amount, t.currency, rates);
    if (t.type === 'donation') {
      donationsUsd += usd;
    } else {
      purchasesUsd += usd;
      const key = t.category_name || 'غير مصنّف';
      byCategory[key] = (byCategory[key] || 0) + usd;
    }
    return { ...t, amount_usd: usd, images: imgByTx[t.id] || [] };
  });

  return {
    profiles,
    active_profile: pid,
    rates,
    categories,
    transactions,
    totals: {
      donations_usd: donationsUsd,
      purchases_usd: purchasesUsd,
      balance_usd: donationsUsd - purchasesUsd,
    },
    by_category: Object.entries(byCategory)
      .map(([name, usd]) => ({ name, usd }))
      .sort((a, b) => b.usd - a.usd),
    suggestions: listSuggestions(pid),
  };
}
