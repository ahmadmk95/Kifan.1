import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, canFridge } from '@/lib/auth';
import { normalizeStore } from '@/lib/fridge';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 40);
  if (!name) return NextResponse.json({ error: 'اسم الوحدة مطلوب' }, { status: 400 });
  const store = normalizeStore(body.store);

  const exists = db.prepare('SELECT id FROM fridge_units WHERE store = ? AND name = ? COLLATE NOCASE').get(store, name);
  if (exists) return NextResponse.json({ unit: { id: exists.id, name } });

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO fridge_units (id, store, name) VALUES (?, ?, ?)').run(id, store, name);
  return NextResponse.json({ unit: { id, name } });
}
