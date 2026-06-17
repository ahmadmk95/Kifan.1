import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const rows = db.prepare(`
    SELECT
      u.id,
      u.name,
      u.committee_id,
      u.title,
      COALESCE(a.n, 0) + COALESCE(c.n, 0) AS points
    FROM users u
    LEFT JOIN (
      SELECT assignee_id AS uid, COUNT(*) AS n
      FROM tasks WHERE done = 1 AND assignee_id IS NOT NULL
      GROUP BY assignee_id
    ) a ON a.uid = u.id
    LEFT JOIN (
      SELECT user_id AS uid, COUNT(*) AS n
      FROM task_completions
      GROUP BY user_id
    ) c ON c.uid = u.id
    WHERE u.role IN ('servant','committee_supervisor') AND u.status = 'active'
    ORDER BY points DESC, u.name ASC
  `).all();

  const committees = db.prepare('SELECT * FROM committees').all();
  const commById = Object.fromEntries(committees.map((c) => [c.id, c]));

  const members = rows.map((r, i) => ({
    id: r.id,
    name: r.name,
    title: r.title,
    points: r.points,
    rank: i + 1,
    committee: commById[r.committee_id] || null,
    is_me: r.id === user.id,
  }));

  return NextResponse.json({ members });
}
