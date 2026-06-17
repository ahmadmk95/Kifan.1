import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, canManageCommittee } from '@/lib/auth';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);
  if (!task) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const isUnassigned = !task.assignee_id;
  if (!isUnassigned && task.assignee_id !== user.id && !canManageCommittee(user, task.committee_id)) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const done = !!body.done;
  if (isUnassigned && done) {
    db.prepare('UPDATE tasks SET done = 1, assignee_id = ? WHERE id = ?').run(user.id, params.id);
  } else {
    db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(done ? 1 : 0, params.id);
  }
  return NextResponse.json({ ok: true, done });
}
