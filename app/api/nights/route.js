import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  const nights = db.prepare('SELECT * FROM nights ORDER BY number').all();
  return NextResponse.json({ nights });
}
