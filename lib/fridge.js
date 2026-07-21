import db from './db';

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
