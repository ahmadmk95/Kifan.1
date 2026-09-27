import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { createSession, publicUser, checkPassword, lockMessage } from '@/lib/auth';

export async function POST(req) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' }, { status: 400 });
  }
  // Phone keyboards often capitalise the first letter ("Admin"), so match the
  // username case-insensitively. Phone-number usernames are unaffected.
  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(String(username).trim());
  if (!user) {
    return NextResponse.json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' }, { status: 401 });
  }
  const res = checkPassword(user, password);
  if (!res.ok) {
    if (res.locked) return NextResponse.json({ error: lockMessage(res.locked) }, { status: 423 });
    const hint = res.left <= 2 ? ` (تبقّى ${res.left === 1 ? 'محاولة واحدة' : 'محاولتان'} قبل قفل الحساب)` : '';
    return NextResponse.json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' + hint }, { status: 401 });
  }
  if (user.status === 'pending') {
    return NextResponse.json({ error: 'حسابك قيد المراجعة — بانتظار موافقة الإدارة' }, { status: 403 });
  }
  await createSession(user.id);
  return NextResponse.json({ user: publicUser(user) });
}
