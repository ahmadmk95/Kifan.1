import { NextResponse } from 'next/server';
import { getCurrentUser, canAccountingView } from '@/lib/auth';
import { getAccounting } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!canAccountingView(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const profile = new URL(req.url).searchParams.get('profile') || undefined;
  return NextResponse.json(getAccounting(profile));
}
