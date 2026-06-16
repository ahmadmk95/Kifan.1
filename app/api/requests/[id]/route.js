import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  db.prepare("DELETE FROM users WHERE id = ? AND status = 'pending'").run(params.id);
  return NextResponse.json({ ok: true });
}
