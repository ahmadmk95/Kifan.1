import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, publicUser, isLead } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  const { n: unseen_ratings } = db
    .prepare(`SELECT COUNT(*) as n FROM ratings WHERE member_id = ? AND seen_at IS NULL`)
    .get(user.id);
  let unseen_comments = 0;
  if (isLead(user)) {
    const row = user.role === 'supervisor'
      ? db.prepare(`SELECT COUNT(*) as n FROM comments WHERE seen_at IS NULL`).get()
      : db.prepare(`SELECT COUNT(*) as n FROM comments c JOIN tasks t ON t.id = c.task_id WHERE c.seen_at IS NULL AND t.committee_id = ?`).get(user.committee_id);
    unseen_comments = row.n;
  }
  return NextResponse.json({ user: { ...publicUser(user), unseen_ratings, unseen_comments } });
}
