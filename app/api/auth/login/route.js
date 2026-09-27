import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSession, publicUser } from '@/lib/auth';

export async function POST(req) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' }, { status: 400 });
  }
  // Phone keyboards often capitalise the first letter ("Admin"), so match the
  // username case-insensitively. Phone-number usernames are unaffected.
  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(String(username).trim());
  // Accept the password exactly as typed, or with stray whitespace from
  // autocomplete removed — the exact match is tried first, so a password that
  // genuinely contains spaces still works.
  const pw = String(password);
  const ok = !!user && (bcrypt.compareSync(pw, user.password_hash) ||
    (pw.trim() !== pw && bcrypt.compareSync(pw.trim(), user.password_hash)));
  if (!ok) {
    return NextResponse.json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' }, { status: 401 });
  }
  if (user.status === 'pending') {
    return NextResponse.json({ error: 'حسابك قيد المراجعة — بانتظار موافقة الإدارة' }, { status: 403 });
  }
  await createSession(user.id);
  return NextResponse.json({ user: publicUser(user) });
}
