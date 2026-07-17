export function slugify(name) {
  return String(name)
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'lajna';
}

export function uniqueSlug(db, name, excludeId = null) {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  const stmt = excludeId
    ? db.prepare('SELECT 1 FROM committees WHERE slug = ? AND id != ?')
    : db.prepare('SELECT 1 FROM committees WHERE slug = ?');
  while (excludeId ? stmt.get(slug, excludeId) : stmt.get(slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}
