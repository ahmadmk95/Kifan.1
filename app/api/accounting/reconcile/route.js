import { NextResponse } from 'next/server';
import { getCurrentUser, canAccounting, canAccountingView } from '@/lib/auth';
import { saveReconciliation, listReconciliations } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!canAccountingView(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const profile = new URL(req.url).searchParams.get('profile') || undefined;
  return NextResponse.json({ reconciliations: listReconciliations(profile) });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!canAccounting(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    const row = saveReconciliation(body.profile, body.counts || {}, body.note, user.name);
    return NextResponse.json({ reconciliation: row });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر الحفظ' }, { status: e.status || 400 });
  }
}
