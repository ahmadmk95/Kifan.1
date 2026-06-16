import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.username, u.role, u.title, u.committee_id, u.status, u.initials, c.name as committee_name
       FROM users u LEFT JOIN committees c ON c.id = u.committee_id
       ORDER BY u.created_at`
    )
    .all();

  return NextResponse.json({ users: rows });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  const username = (body.username || '').trim();
  const password = (body.password || '').trim();
  const role = body.role === 'supervisor' ? 'supervisor' : 'servant';
  const committeeId = body.committee_id || null;

  if (!name || !username || !password) {
    return NextResponse.json({ error: 'يرجى تعبئة جميع الحقول' }, { status: 400 });
  }

  const existing = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(username);
  if (existing) return NextResponse.json({ error: 'اسم المستخدم محجوز، اختاري اسماً آخر' }, { status: 409 });

  let title = '';
  if (role === 'supervisor') {
    title = 'خادمة الحسين';
  } else if (committeeId) {
    const committee = db.prepare('SELECT * FROM committees WHERE id = ?').get(committeeId);
    if (!committee) return NextResponse.json({ error: 'لجنة غير موجودة' }, { status: 400 });
    title = 'خادمة ' + committee.name;
  }

  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (id, name, username, password_hash, role, title, committee_id, status, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, username, hash, role, title, role === 'servant' ? committeeId : null, 'active', name[0] || '');

  const created = db.prepare('SELECT id, name, username, role, title, committee_id, status, initials FROM users WHERE id = ?').get(id);
  return NextResponse.json({ user: created });
}
