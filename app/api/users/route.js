import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const users = db.prepare('SELECT id, name, username, role, created_at FROM users ORDER BY created_at ASC').all();
  return NextResponse.json({ users });
}

export async function POST(req) {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const role = ['admin', 'member'].includes(body.role) ? body.role : 'member';
  if (!name || !username || !password) {
    return NextResponse.json({ error: 'يرجى تعبئة جميع الحقول' }, { status: 400 });
  }
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (exists) return NextResponse.json({ error: 'اسم المستخدم مستخدم مسبقاً' }, { status: 409 });
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(
    id, name, username, bcrypt.hashSync(password, 10), role
  );
  return NextResponse.json({ user: { id, name, username, role } });
}
