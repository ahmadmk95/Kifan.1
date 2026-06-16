import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const committee = db.prepare('SELECT * FROM committees WHERE id = ?').get(params.id);
  if (!committee) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const txn = db.transaction(() => {
    const taskIds = db.prepare('SELECT id FROM tasks WHERE committee_id = ?').all(params.id).map((t) => t.id);
    const delComments = db.prepare('DELETE FROM comments WHERE task_id = ?');
    taskIds.forEach((tid) => delComments.run(tid));
    db.prepare('DELETE FROM tasks WHERE committee_id = ?').run(params.id);
    db.prepare(
      "UPDATE users SET committee_id = NULL, status = 'pending', title = '', role = CASE WHEN role = 'committee_supervisor' THEN 'servant' ELSE role END WHERE committee_id = ?"
    ).run(params.id);
    db.prepare('DELETE FROM committees WHERE id = ?').run(params.id);
  });
  txn();

  return NextResponse.json({ ok: true });
}
