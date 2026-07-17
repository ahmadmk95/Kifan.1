import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export async function PATCH(req, { params }) {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (body.password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(String(body.password), 10), params.id);
  }
  if (body.role && ['admin', 'member'].includes(body.role)) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(body.role, params.id);
  }
  if (body.name !== undefined && String(body.name).trim()) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(body.name).trim(), params.id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  if (admin.id === params.id) {
    return NextResponse.json({ error: 'لا يمكنك حذف حسابك الحالي' }, { status: 400 });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
