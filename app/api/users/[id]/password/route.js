import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const password = (body.password || '').trim();
  if (!password || password.length < 4) {
    return NextResponse.json({ error: 'كلمة المرور قصيرة جداً' }, { status: 400 });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, params.id);
  return NextResponse.json({ ok: true });
}
