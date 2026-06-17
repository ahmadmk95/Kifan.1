import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSession, publicUser } from '@/lib/auth';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const username = (body.username || '').trim();
  const password = (body.password || '').trim();

  const user = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
  }
  if (user.status === 'pending') {
    return NextResponse.json({ error: 'حسابكِ بانتظار التفعيل من خادمة الحسين' }, { status: 403 });
  }

  await createSession(user.id);
  const { n: unseen_ratings } = db
    .prepare(`SELECT COUNT(*) as n FROM ratings WHERE member_id = ? AND seen_at IS NULL`)
    .get(user.id);
  return NextResponse.json({ user: { ...publicUser(user), unseen_ratings } });
}
