import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function serializeSpotlight(s, memberName) {
  if (!s) return null;
  return {
    id: s.id,
    member_id: s.member_id,
    member_name: memberName,
    note: s.note,
    cheer_count: s.cheer_count,
    created_at: s.created_at,
  };
}

export async function GET() {
  const row = db
    .prepare(
      `SELECT s.*, u.name as member_name FROM spotlight s JOIN users u ON u.id = s.member_id
       WHERE date(s.created_at) = date('now') ORDER BY s.created_at DESC LIMIT 1`
    )
    .get();
  return NextResponse.json({ spotlight: row ? serializeSpotlight(row, row.member_name) : null });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const memberId = body.memberId;
  const note = (body.note || '').trim();
  if (!memberId) return NextResponse.json({ error: 'العضوة مطلوبة' }, { status: 400 });

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(memberId);
  if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO spotlight (id, member_id, note, set_by, cheer_count) VALUES (?, ?, ?, ?, 0)').run(
    id,
    memberId,
    note,
    user.id
  );

  const row = db.prepare('SELECT * FROM spotlight WHERE id = ?').get(id);
  return NextResponse.json({ spotlight: serializeSpotlight(row, target.name) });
}

export async function PATCH(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const memberId = body.memberId;
  const note = (body.note || '').trim();
  if (!memberId) return NextResponse.json({ error: 'العضوة مطلوبة' }, { status: 400 });

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(memberId);
  if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const current = db
    .prepare(`SELECT * FROM spotlight WHERE date(created_at) = date('now') ORDER BY created_at DESC LIMIT 1`)
    .get();

  if (!current) {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO spotlight (id, member_id, note, set_by, cheer_count) VALUES (?, ?, ?, ?, 0)').run(
      id,
      memberId,
      note,
      user.id
    );
    const row = db.prepare('SELECT * FROM spotlight WHERE id = ?').get(id);
    return NextResponse.json({ spotlight: serializeSpotlight(row, target.name) });
  }

  db.prepare('UPDATE spotlight SET member_id = ?, note = ?, set_by = ? WHERE id = ?').run(
    memberId,
    note,
    user.id,
    current.id
  );
  const row = db.prepare('SELECT * FROM spotlight WHERE id = ?').get(current.id);
  return NextResponse.json({ spotlight: serializeSpotlight(row, target.name) });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  db.prepare(`DELETE FROM spotlight WHERE date(created_at) = date('now')`).run();
  return NextResponse.json({ ok: true });
}
