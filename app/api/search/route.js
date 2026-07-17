import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { searchCommittees } from '@/lib/search';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const scope = searchParams.get('scope');

  // Private results only for a logged-in user explicitly searching the private area.
  const user = await getCurrentUser();
  const includePrivate = scope === 'private' && !!user;

  const results = searchCommittees(q, { includePrivate });
  return NextResponse.json({ results });
}
