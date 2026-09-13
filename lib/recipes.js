import crypto from 'crypto';
import db from './db';

// A recipe is a set of ingredients measured at one reference batch. One of them
// is the anchor (الثابت) — ask for a different amount of it and everything else
// scales by the same factor.

export function listRecipes() {
  const recipes = db.prepare('SELECT * FROM recipes ORDER BY name COLLATE NOCASE').all();
  const items = db.prepare('SELECT * FROM recipe_items ORDER BY sort, rowid').all();
  const byRecipe = {};
  for (const it of items) (byRecipe[it.recipe_id] ||= []).push(it);
  return recipes.map((r) => {
    const list = byRecipe[r.id] || [];
    return { ...r, items: list, base: list.find((i) => i.is_base) || null, item_count: list.length };
  });
}

export function getRecipe(id) {
  const r = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
  if (!r) return null;
  const items = db.prepare('SELECT * FROM recipe_items WHERE recipe_id = ? ORDER BY sort, rowid').all(id);
  return { ...r, items, base: items.find((i) => i.is_base) || null };
}

// Normalise the ingredient list coming from the client: keep valid rows, make
// sure exactly one is the anchor, and give it a positive reference quantity.
function cleanItems(rawItems, baseIndex) {
  const items = [];
  (Array.isArray(rawItems) ? rawItems : []).forEach((raw, i) => {
    const name = String(raw?.name || '').trim().slice(0, 120);
    const qty = Number(raw?.qty);
    if (!name || !Number.isFinite(qty) || qty <= 0) return;
    items.push({
      name,
      qty,
      unit: raw?.unit ? String(raw.unit).trim().slice(0, 40) : null,
      whole: raw?.whole ? 1 : 0,
      is_base: i === baseIndex ? 1 : 0,
    });
  });
  if (!items.length) { const e = new Error('أضف مكوّناً واحداً على الأقل'); e.status = 400; throw e; }
  if (!items.some((i) => i.is_base)) items[0].is_base = 1; // fall back to the first
  return items;
}

function replaceItems(recipeId, items) {
  db.prepare('DELETE FROM recipe_items WHERE recipe_id = ?').run(recipeId);
  const ins = db.prepare(
    'INSERT INTO recipe_items (id, recipe_id, name, qty, unit, is_base, whole, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  items.forEach((it, i) => ins.run(crypto.randomUUID(), recipeId, it.name, it.qty, it.unit, it.is_base, it.whole, i));
}

export function createRecipe({ name, note, items, baseIndex }) {
  const clean = String(name || '').trim().slice(0, 120);
  if (!clean) { const e = new Error('اسم الطبخة مطلوب'); e.status = 400; throw e; }
  const list = cleanItems(items, Number(baseIndex));
  const id = crypto.randomUUID();
  db.transaction(() => {
    db.prepare('INSERT INTO recipes (id, name, note) VALUES (?, ?, ?)').run(
      id, clean, note ? String(note).trim().slice(0, 500) : null
    );
    replaceItems(id, list);
  })();
  return getRecipe(id);
}

export function updateRecipe(id, { name, note, items, baseIndex }) {
  const existing = db.prepare('SELECT id FROM recipes WHERE id = ?').get(id);
  if (!existing) { const e = new Error('الطبخة غير موجودة'); e.status = 404; throw e; }
  const clean = String(name || '').trim().slice(0, 120);
  if (!clean) { const e = new Error('اسم الطبخة مطلوب'); e.status = 400; throw e; }
  const list = cleanItems(items, Number(baseIndex));
  db.transaction(() => {
    db.prepare("UPDATE recipes SET name = ?, note = ?, updated_at = datetime('now') WHERE id = ?").run(
      clean, note ? String(note).trim().slice(0, 500) : null, id
    );
    replaceItems(id, list);
  })();
  return getRecipe(id);
}

export function deleteRecipe(id) {
  db.transaction(() => {
    db.prepare('DELETE FROM recipe_items WHERE recipe_id = ?').run(id);
    db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  })();
  return { ok: true };
}
