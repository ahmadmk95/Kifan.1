import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { getCurrentUser, isAdmin, canViewAdmin, authorityToRole } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!canViewAdmin(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const users = db
    .prepare('SELECT id, name, username, role, access, status, created_at FROM users ORDER BY created_at ASC')
    .all();
  return NextResponse.json({ users });
}

export async function POST(req) {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const username = String(body.username || '').trim(); // phone number
  const password = String(body.password || '');
  const { role, access } = authorityToRole(body.authority);
  if (!name || !username || !password) {
    return NextResponse.json({ error: 'يرجى تعبئة جميع الحقول' }, { status: 400 });
  }
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (exists) return NextResponse.json({ error: 'رقم الهاتف مسجّل مسبقاً' }, { status: 409 });
  const id = crypto.randomUUID();
  // Admin-created accounts are active immediately.
  db.prepare(
    "INSERT INTO users (id, name, username, password_hash, role, access, status) VALUES (?, ?, ?, ?, ?, ?, 'active')"
  ).run(id, name, username, bcrypt.hashSync(password, 10), role, access);
  return NextResponse.json({ user: { id, name, username, role, access } });
}
