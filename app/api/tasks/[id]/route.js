import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, canManageCommittee } from '@/lib/auth';
import { serializeTask, serializeComment } from '@/lib/serialize';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);
  if (!task) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  if (!canManageCommittee(user, task.committee_id)) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title || '').trim() || task.title;
  const time = (body.time || '').trim() || task.time;
  const place = (body.place || '').trim() || task.place;
  const note = body.note !== undefined ? (body.note || '').trim() || null : task.note;
  const assignee_id = body.assignee_id !== undefined ? body.assignee_id || null : task.assignee_id;

  db.prepare('UPDATE tasks SET title=?, time=?, place=?, note=?, assignee_id=? WHERE id=?').run(
    title, time, place, note, assignee_id, params.id
  );

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);
  const comments = db.prepare(
    `SELECT c.*, u.name as author_name FROM comments c JOIN users u ON u.id = c.author_id WHERE c.task_id = ? ORDER BY c.created_at`
  ).all(params.id);
  return NextResponse.json({ task: serializeTask(updated, { comments: comments.map((c) => serializeComment(c, c.author_name)) }) });
}

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
