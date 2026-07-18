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

export function getAccounting() {
  const rates = getRates();
  const categories = db.prepare('SELECT id, name FROM purchase_categories ORDER BY name COLLATE NOCASE').all();

  const txRows = db
    .prepare(
      `SELECT t.*, c.name AS category_name
       FROM acc_transactions t
       LEFT JOIN purchase_categories c ON c.id = t.category_id
       ORDER BY t.occurred_on DESC, t.created_at DESC`
    )
    .all();

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
  };
}
