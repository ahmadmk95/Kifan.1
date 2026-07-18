import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  return NextResponse.json(getStats());
}
