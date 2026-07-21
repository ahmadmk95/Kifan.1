import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, canFridge } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  // Keep the items, just detach the category.
  db.prepare('UPDATE fridge_items SET category_id = NULL WHERE category_id = ?').run(params.id);
  db.prepare('DELETE FROM fridge_categories WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
