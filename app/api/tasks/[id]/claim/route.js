import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);
  if (!task) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  if (task.assignee_id) return NextResponse.json({ error: 'المهمة مُسندة بالفعل' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const claim = !!body.claim;

  if (claim) {
    try {
      db.prepare('INSERT INTO task_claims (id, task_id, user_id) VALUES (?, ?, ?)').run(
        crypto.randomUUID(), params.id, user.id
      );
    } catch {
      // already claimed by this user
    }
  } else {
    db.prepare('DELETE FROM task_claims WHERE task_id = ? AND user_id = ?').run(params.id, user.id);
  }

  return NextResponse.json({ ok: true, claim });
}
