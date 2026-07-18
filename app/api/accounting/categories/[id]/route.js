import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, canAccounting } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!canAccounting(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  // Keep the purchases, just detach the category.
  db.prepare('UPDATE acc_transactions SET category_id = NULL WHERE category_id = ?').run(params.id);
  db.prepare('DELETE FROM purchase_categories WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
