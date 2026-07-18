import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, canAccounting } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!canAccounting(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: 'اسم الفئة مطلوب' }, { status: 400 });

  const exists = db.prepare('SELECT id FROM purchase_categories WHERE name = ? COLLATE NOCASE').get(name);
  if (exists) return NextResponse.json({ category: { id: exists.id, name } });

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO purchase_categories (id, name) VALUES (?, ?)').run(id, name);
  return NextResponse.json({ category: { id, name } });
}
