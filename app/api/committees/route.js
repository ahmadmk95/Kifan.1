import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  const committees = db.prepare('SELECT * FROM committees ORDER BY sort').all();
  return NextResponse.json({ committees });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  const color = body.color || '#BE9A3E';
  const soft = body.soft || '#F4EBD2';
  if (!name) return NextResponse.json({ error: 'اسم اللجنة مطلوب' }, { status: 400 });

  const maxSort = db.prepare('SELECT COALESCE(MAX(sort), -1) as m FROM committees').get().m;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO committees (id, name, color, soft, sort) VALUES (?, ?, ?, ?, ?)').run(id, name, color, soft, maxSort + 1);

  const committee = db.prepare('SELECT * FROM committees WHERE id = ?').get(id);
  return NextResponse.json({ committee });
}
