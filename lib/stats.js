import db from './db';

// Aggregate visitor analytics for the admin dashboard.
export function getStats() {
  const totals = db
    .prepare('SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM page_views')
    .get();

  const last7 = db
    .prepare(
      "SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM page_views WHERE created_at >= datetime('now','-7 days')"
    )
    .get();

  const home = db
    .prepare('SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM page_views WHERE committee_id IS NULL')
    .get();

  const committees = db
    .prepare(
      `SELECT c.id, c.name, c.slug, c.visibility,
              COUNT(pv.id) AS views,
              COUNT(DISTINCT pv.visitor_id) AS visitors
       FROM committees c
       LEFT JOIN page_views pv ON pv.committee_id = c.id
       GROUP BY c.id
       ORDER BY views DESC, c.sort ASC`
    )
    .all();

  return { totals, last7, home, committees };
}
