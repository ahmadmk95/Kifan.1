import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, isLead } from '@/lib/auth';
import { serializeTask, serializeComment } from '@/lib/serialize';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (!isLead(user)) return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const nightId = searchParams.get('night');
  if (!nightId) return NextResponse.json({ error: 'night مطلوب' }, { status: 400 });

  const tasks =
    user.role === 'supervisor'
      ? db.prepare('SELECT * FROM tasks WHERE night_id = ? ORDER BY time').all(nightId)
      : db.prepare('SELECT * FROM tasks WHERE night_id = ? AND committee_id = ? ORDER BY time').all(nightId, user.committee_id);
  const commentStmt = db.prepare(
    `SELECT c.*, u.name as author_name FROM comments c JOIN users u ON u.id = c.author_id WHERE c.task_id = ? ORDER BY c.created_at`
  );
  const claimorsStmt = db.prepare(
    `SELECT u.name FROM task_claims tc JOIN users u ON u.id = tc.user_id WHERE tc.task_id = ? ORDER BY tc.created_at`
  );
  const result = tasks.map((t) => {
    const claimors = t.assignee_id ? [] : claimorsStmt.all(t.id).map((r) => r.name);
    return serializeTask(t, {
      comments: commentStmt.all(t.id).map((c) => serializeComment(c, c.author_name)),
      claimors,
    });
  });

  return NextResponse.json({ tasks: result });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (!isLead(user)) return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { night, committee, assignee, title, time, place, note } = body;
  if (!night || !committee || !title?.trim() || !time?.trim() || !place?.trim()) {
    return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
  }
  if (user.role === 'committee_supervisor' && committee !== user.committee_id) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
  }

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO tasks (id, night_id, committee_id, assignee_id, title, time, place, note, done) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)'
  ).run(id, night, committee, assignee || null, title.trim(), time.trim(), place.trim(), note?.trim() || null);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  return NextResponse.json({ task: serializeTask(task, { comments: [] }) });
}
