import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, isLead } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isLead(user)) return NextResponse.json({ count: 0 });
  const row = user.role === 'supervisor'
    ? db.prepare(`SELECT COUNT(*) as n FROM comments WHERE seen_at IS NULL`).get()
    : db.prepare(`SELECT COUNT(*) as n FROM comments c JOIN tasks t ON t.id = c.task_id WHERE c.seen_at IS NULL AND t.committee_id = ?`).get(user.committee_id);
  return NextResponse.json({ count: row.n });
}
