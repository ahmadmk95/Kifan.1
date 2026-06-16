import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  let night = db.prepare('SELECT * FROM nights WHERE active = 1').get();
  if (!night) night = db.prepare('SELECT * FROM nights ORDER BY number LIMIT 1').get();
  return NextResponse.json({ night });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const night = db.prepare('SELECT * FROM nights WHERE id = ?').get(body.id);
  if (!night) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const txn = db.transaction(() => {
    db.prepare('UPDATE nights SET active = 0').run();
    db.prepare('UPDATE nights SET active = 1 WHERE id = ?').run(night.id);
  });
  txn();

  return NextResponse.json({ night: db.prepare('SELECT * FROM nights WHERE id = ?').get(night.id) });
}
