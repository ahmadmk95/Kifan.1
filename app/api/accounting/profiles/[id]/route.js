import { NextResponse } from 'next/server';
import { getCurrentUser, canAccounting } from '@/lib/auth';
import { archiveProfile, restoreProfile, renameProfile } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// Archive (soft-delete) an account book — its data is kept.
export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!canAccounting(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  try {
    return NextResponse.json(archiveProfile(params.id));
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر الأرشفة' }, { status: e.status || 400 });
  }
}

// Restore an archived book back to the active list.
export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!canAccounting(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    if (body.archived === false || body.restore) return NextResponse.json(restoreProfile(params.id));
    if (body.name !== undefined) return NextResponse.json(renameProfile(params.id, body.name));
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر التعديل' }, { status: e.status || 400 });
  }
  return NextResponse.json({ error: 'لا تغيير' }, { status: 400 });
}
