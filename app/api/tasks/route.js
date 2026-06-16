import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { serializeTask, serializeComment } from '@/lib/serialize';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const nightId = searchParams.get('night');
  if (!nightId) return NextResponse.json({ error: 'night مطلوب' }, { status: 400 });

  const tasks = db.prepare('SELECT * FROM tasks WHERE night_id = ? ORDER BY time').all(nightId);
  const commentStmt = db.prepare(
    `SELECT c.*, u.name as author_name FROM comments c JOIN users u ON u.id = c.author_id WHERE c.task_id = ? ORDER BY c.created_at`
  );
  const result = tasks.map((t) =>
    serializeTask(t, { comments: commentStmt.all(t.id).map((c) => serializeComment(c, c.author_name)) })
  );

  return NextResponse.json({ tasks: result });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { night, committee, assignee, title, time, place, note } = body;
  if (!night || !committee || !assignee || !title?.trim() || !time?.trim() || !place?.trim()) {
    return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO tasks (id, night_id, committee_id, assignee_id, title, time, place, note, done) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)'
  ).run(id, night, committee, assignee, title.trim(), time.trim(), place.trim(), note?.trim() || null);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  return NextResponse.json({ task: serializeTask(task, { comments: [] }) });
}
