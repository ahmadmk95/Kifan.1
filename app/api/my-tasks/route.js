import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { serializeTask, serializeComment } from '@/lib/serialize';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const nightId = searchParams.get('night');
  if (!nightId) return NextResponse.json({ error: 'night مطلوب' }, { status: 400 });

  const myTasks = db
    .prepare('SELECT * FROM tasks WHERE night_id = ? AND assignee_id = ? ORDER BY time')
    .all(nightId, user.id);

  const unassigned = user.committee_id
    ? db
        .prepare('SELECT * FROM tasks WHERE night_id = ? AND committee_id = ? AND assignee_id IS NULL ORDER BY time')
        .all(nightId, user.committee_id)
    : [];

  const commentStmt = db.prepare(
    `SELECT c.*, u.name as author_name FROM comments c JOIN users u ON u.id = c.author_id WHERE c.task_id = ? ORDER BY c.created_at`
  );

  const serialize = (t) =>
    serializeTask(t, { comments: commentStmt.all(t.id).map((c) => serializeComment(c, c.author_name)) });

  return NextResponse.json({ tasks: myTasks.map(serialize), unassigned: unassigned.map(serialize) });
}
