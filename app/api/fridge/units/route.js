import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, canFridge } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 40);
  if (!name) return NextResponse.json({ error: 'اسم الوحدة مطلوب' }, { status: 400 });

  const exists = db.prepare('SELECT id FROM fridge_units WHERE name = ? COLLATE NOCASE').get(name);
  if (exists) return NextResponse.json({ unit: { id: exists.id, name } });

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO fridge_units (id, name) VALUES (?, ?)').run(id, name);
  return NextResponse.json({ unit: { id, name } });
}
