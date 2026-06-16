import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const rating = db.prepare('SELECT * FROM ratings WHERE id = ?').get(params.id);
  if (!rating) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  if (rating.author_id !== user.id && user.role !== 'supervisor') {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
  }

  db.prepare('DELETE FROM ratings WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
