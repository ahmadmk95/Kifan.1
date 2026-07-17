import db from './db';

const PUBLIC_VIS = ['public', 'both'];
const PRIVATE_VIS = ['public', 'private', 'both'];

export function listCommittees({ includePrivate = false } = {}) {
  const vis = includePrivate ? PRIVATE_VIS : PUBLIC_VIS;
  const placeholders = vis.map(() => '?').join(',');
  return db
    .prepare(`SELECT id, name, slug, sort, visibility FROM committees WHERE visibility IN (${placeholders}) ORDER BY sort ASC, name ASC`)
    .all(...vis);
}

export function getCommitteeBySlug(slug, { includePrivate = false } = {}) {
  const row = db.prepare('SELECT * FROM committees WHERE slug = ?').get(slug);
  if (!row) return null;
  if (!includePrivate && row.visibility === 'private') return null;
  return row;
}
