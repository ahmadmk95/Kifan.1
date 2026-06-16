import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, canManageCommittee } from '@/lib/auth';

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND task_id = ?').get(params.commentId, params.id);
  if (!comment) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);

  if (comment.author_id !== user.id && !canManageCommittee(user, task?.committee_id)) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(params.commentId);
  return NextResponse.json({ ok: true });
}
