import db from './db';

export const STORES = ['fridge', 'dargeel'];
export const normalizeStore = (s) => (STORES.includes(s) ? s : 'fridge');

export function listFridgeUnits(store = 'fridge') {
  return db.prepare('SELECT id, name FROM fridge_units WHERE store = ? ORDER BY name COLLATE NOCASE').all(normalizeStore(store));
}

export function listItems(store = 'fridge') {
  return db.prepare('SELECT * FROM fridge_items WHERE store = ? ORDER BY name COLLATE NOCASE').all(normalizeStore(store));
}

export function getItem(id) {
  const item = db.prepare('SELECT * FROM fridge_items WHERE id = ?').get(id);
  if (!item) return null;
  const movements = db
    .prepare('SELECT * FROM fridge_movements WHERE item_id = ? ORDER BY created_at DESC, rowid DESC')
    .all(id);
  return { ...item, movements };
}

// Distinct previously-entered values, most-used first, for input autocomplete.
export function listFridgeSuggestions(store = 'fridge') {
  const st = normalizeStore(store);
  const items = db.prepare('SELECT name, unit, note FROM fridge_items WHERE store = ?').all(st);
  const movs = db
    .prepare('SELECT m.reason FROM fridge_movements m JOIN fridge_items i ON i.id = m.item_id WHERE i.store = ?')
    .all(st);
  const rank = (values) => {
    const counts = new Map();
    for (const v of values) {
      const s = (v || '').trim();
      if (s) counts.set(s, (counts.get(s) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]).slice(0, 200);
  };
  return {
    names: rank(items.map((i) => i.name)),
    units: rank(items.map((i) => i.unit)),
    notes: rank(items.map((i) => i.note)),
    reasons: rank(movs.map((m) => m.reason)),
  };
}
