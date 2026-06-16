import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '@/lib/db';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  const username = (body.username || '').trim();
  const password = (body.password || '').trim();

  if (!name || !username || !password) {
    return NextResponse.json({ error: 'يرجى تعبئة جميع الحقول' }, { status: 400 });
  }

  const existing = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(username);
  if (existing) {
    return NextResponse.json({ error: 'اسم المستخدم محجوز، اختاري اسماً آخر' }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (id, name, username, password_hash, role, title, committee_id, status, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, username, hash, 'servant', '', null, 'pending', name[0] || '');

  return NextResponse.json({ ok: true });
}
