import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');

  if (!name || !phone || !password) {
    return NextResponse.json({ error: 'يرجى تعبئة الاسم ورقم الهاتف وكلمة المرور' }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: 'كلمة المرور قصيرة جداً' }, { status: 400 });
  }

  // Phone number is the username.
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(phone);
  if (exists) {
    return NextResponse.json({ error: 'رقم الهاتف مسجّل مسبقاً' }, { status: 409 });
  }

  db.prepare(
    "INSERT INTO users (id, name, username, password_hash, role, access, status) VALUES (?, ?, ?, ?, 'member', 'committees', 'pending')"
  ).run(crypto.randomUUID(), name, phone, bcrypt.hashSync(password, 10));

  return NextResponse.json({ ok: true });
}
