import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const committeeId = body.committee_id;
  const committee = db.prepare('SELECT * FROM committees WHERE id = ?').get(committeeId);
  if (!committee) return NextResponse.json({ error: 'لجنة غير موجودة' }, { status: 400 });

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  db.prepare("UPDATE users SET status = 'active', committee_id = ?, title = ? WHERE id = ?").run(
    committeeId,
    'خادمة ' + committee.name,
    params.id
  );
  return NextResponse.json({ ok: true });
}
