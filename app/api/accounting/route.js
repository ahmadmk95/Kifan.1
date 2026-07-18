import { NextResponse } from 'next/server';
import { getCurrentUser, canAccounting } from '@/lib/auth';
import { getAccounting } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!canAccounting(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  return NextResponse.json(getAccounting());
}
