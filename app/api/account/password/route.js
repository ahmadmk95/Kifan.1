import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { getCurrentUser, checkPassword, lockMessage } from '@/lib/auth';

// Any signed-in user changes their own password (current password required).
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'يرجى تسجيل الدخول' }, { status: 401 });
  const { current, next } = await req.json().catch(() => ({}));
  const pw = String(next || '');
  if (pw.length < 8) return NextResponse.json({ error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' }, { status: 400 });
  const res = checkPassword(user, current);
  if (!res.ok) {
    if (res.locked) return NextResponse.json({ error: lockMessage(res.locked) }, { status: 423 });
    return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 401 });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(pw, 10), user.id);
  return NextResponse.json({ ok: true });
}
