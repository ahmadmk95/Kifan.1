import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getAccounting } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  return NextResponse.json(getAccounting());
}
