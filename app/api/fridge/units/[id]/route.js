import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, canFridge } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  // Units live as free text on items; removing one only trims the offered list.
  db.prepare('DELETE FROM fridge_units WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
