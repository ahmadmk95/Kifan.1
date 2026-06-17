import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, publicUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  const { n: unseen_ratings } = db
    .prepare(`SELECT COUNT(*) as n FROM ratings WHERE member_id = ? AND seen_at IS NULL`)
    .get(user.id);
  return NextResponse.json({ user: { ...publicUser(user), unseen_ratings } });
}
