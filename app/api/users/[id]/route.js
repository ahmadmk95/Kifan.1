import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { getCurrentUser, isAdmin, isViewer, authorityToRole } from '@/lib/auth';

export async function PATCH(req, { params }) {
  const admin = await getCurrentUser();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
  const body = await req.json().catch(() => ({}));

  // The supervisor (viewer) may ONLY approve a pending user: set status/authority
  // on a pending account — nothing else (no passwords, names, or active users).
  const viewerApproving =
    isViewer(admin) &&
    target.status === 'pending' &&
    !body.password &&
    body.name === undefined &&
    body.authority !== 'admin'; // a supervisor cannot grant full admin
  if (!isAdmin(admin) && !viewerApproving) {
    return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  }

  if (body.password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(String(body.password), 10), params.id);
  }
  // Set authority (used for approving a pending user and for changing access).
  if (body.authority !== undefined) {
    const { role, access } = authorityToRole(body.authority);
    db.prepare('UPDATE users SET role = ?, access = ? WHERE id = ?').run(role, access, params.id);
  }
  if (body.status === 'active' || body.status === 'pending') {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(body.status, params.id);
  }
  if (body.name !== undefined && String(body.name).trim()) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(body.name).trim(), params.id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const admin = await getCurrentUser();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!target) return NextResponse.json({ ok: true });
  // The supervisor may only reject (delete) pending requests.
  const viewerRejecting = isViewer(admin) && target.status === 'pending';
  if (!isAdmin(admin) && !viewerRejecting) {
    return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  }
  if (admin.id === params.id) {
    return NextResponse.json({ error: 'لا يمكنك حذف حسابك الحالي' }, { status: 400 });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
