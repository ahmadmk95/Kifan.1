import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
  const row = db.prepare('SELECT * FROM spotlight ORDER BY created_at DESC LIMIT 1').get();
  if (!row) return NextResponse.json({ error: 'لا يوجد تكريم حالياً' }, { status: 404 });

  db.prepare('UPDATE spotlight SET cheer_count = cheer_count + 1 WHERE id = ?').run(row.id);
  const updated = db.prepare('SELECT cheer_count FROM spotlight WHERE id = ?').get(row.id);
  return NextResponse.json({ cheer_count: updated.cheer_count });
}
