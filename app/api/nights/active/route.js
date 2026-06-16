import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  const night = db.prepare('SELECT * FROM nights WHERE number = 3').get();
  return NextResponse.json({ night });
}
