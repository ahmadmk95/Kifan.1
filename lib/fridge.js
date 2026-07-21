import db from './db';

export function listFridgeUnits() {
  return db.prepare('SELECT id, name FROM fridge_units ORDER BY name COLLATE NOCASE').all();
}

export function listItems() {
  return db.prepare('SELECT * FROM fridge_items ORDER BY name COLLATE NOCASE').all();
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
export function listFridgeSuggestions() {
  const items = db.prepare('SELECT name, unit, note FROM fridge_items').all();
  const movs = db.prepare('SELECT reason FROM fridge_movements').all();
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
