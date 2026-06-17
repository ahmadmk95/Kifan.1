import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, canManageCommittee } from '@/lib/auth';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);
  if (!task) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const done = !!body.done;

  if (!task.assignee_id) {
    // Unassigned task: each user gets their own completion record
    if (done) {
      try {
        db.prepare('INSERT INTO task_completions (id, task_id, user_id) VALUES (?, ?, ?)').run(
          crypto.randomUUID(), params.id, user.id
        );
      } catch {
        // already completed by this user (UNIQUE constraint)
      }
    } else {
      db.prepare('DELETE FROM task_completions WHERE task_id = ? AND user_id = ?').run(params.id, user.id);
    }
    return NextResponse.json({ ok: true, done });
  }

  // Assigned task: only the assignee or a lead can toggle
  if (task.assignee_id !== user.id && !canManageCommittee(user, task.committee_id)) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
  }
  db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(done ? 1 : 0, params.id);
  return NextResponse.json({ ok: true, done });
}
