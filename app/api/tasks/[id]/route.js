import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, canManageCommittee } from '@/lib/auth';

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);
  if (!task) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  if (!canManageCommittee(user, task.committee_id)) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
  }

  const txn = db.transaction(() => {
    db.prepare('DELETE FROM comments WHERE task_id = ?').run(params.id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(params.id);
  });
  txn();

  return NextResponse.json({ ok: true });
}
