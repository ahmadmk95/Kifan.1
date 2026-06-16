import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const pending = db.prepare("SELECT id, name, username, initials FROM users WHERE status = 'pending'").all();
  return NextResponse.json({ requests: pending });
}
