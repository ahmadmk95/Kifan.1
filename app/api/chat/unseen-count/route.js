import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0 });

  if (user.role === 'supervisor') {
    // Count messages across ALL committees newer than user's last_read per committee
    const { n } = db.prepare(`
      SELECT COUNT(*) as n FROM chat_messages m
      WHERE m.created_at > COALESCE(
        (SELECT last_read_at FROM chat_reads WHERE user_id = ? AND committee_id = m.committee_id),
        '1970-01-01'
      )
    `).get(user.id);
    return NextResponse.json({ count: n });
  }

  if (!user.committee_id) return NextResponse.json({ count: 0 });

  const { n } = db.prepare(`
    SELECT COUNT(*) as n FROM chat_messages m
    WHERE m.committee_id = ? AND m.created_at > COALESCE(
      (SELECT last_read_at FROM chat_reads WHERE user_id = ? AND committee_id = ?),
      '1970-01-01'
    )
  `).get(user.committee_id, user.id, user.committee_id);
  return NextResponse.json({ count: n });
}
