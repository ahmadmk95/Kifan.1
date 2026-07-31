import { NextResponse } from 'next/server';
import { getCurrentUser, canAccounting } from '@/lib/auth';
import { createProfile } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!canAccounting(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    const profile = createProfile(body.name);
    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر الإضافة' }, { status: e.status || 400 });
  }
}
