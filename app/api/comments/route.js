import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, isLead } from '@/lib/auth';
import { serializeComment } from '@/lib/serialize';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (!isLead(user)) return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const nightId = searchParams.get('night');
  if (!nightId) return NextResponse.json({ error: 'night مطلوب' }, { status: 400 });

  const rows =
    user.role === 'supervisor'
      ? db
          .prepare(
            `SELECT c.*, u.name as author_name, t.title as task_title
             FROM comments c
             JOIN users u ON u.id = c.author_id
             JOIN tasks t ON t.id = c.task_id
             WHERE t.night_id = ?
             ORDER BY c.created_at DESC`
          )
          .all(nightId)
      : db
          .prepare(
            `SELECT c.*, u.name as author_name, t.title as task_title
             FROM comments c
             JOIN users u ON u.id = c.author_id
             JOIN tasks t ON t.id = c.task_id
             WHERE t.night_id = ? AND t.committee_id = ?
             ORDER BY c.created_at DESC`
          )
          .all(nightId, user.committee_id);

  const comments = rows.map((c) => ({ ...serializeComment(c, c.author_name), task_title: c.task_title }));
  return NextResponse.json({ comments });
}
