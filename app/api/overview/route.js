import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const nightId = searchParams.get('night');
  if (!nightId) return NextResponse.json({ error: 'night مطلوب' }, { status: 400 });

  const servants = db.prepare("SELECT * FROM users WHERE role = 'servant' AND status = 'active'").all();
  const tasks = db.prepare('SELECT * FROM tasks WHERE night_id = ?').all(nightId);

  const members = servants.map((s) => {
    const mine = tasks.filter((t) => t.assignee_id === s.id);
    const done = mine.filter((t) => t.done).length;
    return {
      id: s.id,
      name: s.name,
      title: s.title,
      committee_id: s.committee_id,
      total: mine.length,
      done,
      percent: mine.length ? Math.round((done / mine.length) * 100) : 0,
    };
  });

  const totalDone = tasks.filter((t) => t.done).length;
  const committeesCount = db.prepare('SELECT COUNT(*) as c FROM committees').get().c;

  return NextResponse.json({
    members,
    totals: { done: totalDone, total: tasks.length, servants: servants.length, committees: committeesCount },
  });
}
