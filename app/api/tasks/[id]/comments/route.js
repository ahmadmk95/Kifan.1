import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, canManageCommittee } from '@/lib/auth';
import { serializeComment } from '@/lib/serialize';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);
  if (!task) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  if (task.assignee_id !== user.id && !canManageCommittee(user, task.committee_id)) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = (body.text || '').trim();
  if (!text) return NextResponse.json({ error: 'نص التعليق مطلوب' }, { status: 400 });

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO comments (id, task_id, author_id, text) VALUES (?, ?, ?, ?)').run(id, params.id, user.id, text);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  return NextResponse.json({ comment: serializeComment(comment, user.name) });
}
