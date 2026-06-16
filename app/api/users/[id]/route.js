import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
  if (params.id === user.id) return NextResponse.json({ error: 'لا يمكنكِ حذف حسابكِ الخاص' }, { status: 400 });

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const txn = db.transaction(() => {
    const taskIds = db.prepare('SELECT id FROM tasks WHERE assignee_id = ?').all(params.id).map((t) => t.id);
    const delComments = db.prepare('DELETE FROM comments WHERE task_id = ?');
    taskIds.forEach((tid) => delComments.run(tid));
    db.prepare('DELETE FROM tasks WHERE assignee_id = ?').run(params.id);
    db.prepare('DELETE FROM comments WHERE author_id = ?').run(params.id);
    db.prepare('DELETE FROM ratings WHERE member_id = ? OR author_id = ?').run(params.id, params.id);
    db.prepare('UPDATE committees SET supervisor_id = NULL WHERE supervisor_id = ?').run(params.id);
    db.prepare('DELETE FROM spotlight WHERE member_id = ? OR set_by = ?').run(params.id, params.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(params.id);
  });
  txn();

  return NextResponse.json({ ok: true });
}
