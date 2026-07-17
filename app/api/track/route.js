import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const VID_COOKIE = 'mwk_vid';

export async function POST(req) {
  // Don't count the site's own admins browsing their content.
  const user = await getCurrentUser();
  if (isAdmin(user)) return NextResponse.json({ ok: true, skipped: true });

  const { slug } = await req.json().catch(() => ({}));

  const res = NextResponse.json({ ok: true });
  let vid = cookies().get(VID_COOKIE)?.value;
  if (!vid) {
    vid = crypto.randomUUID();
    res.cookies.set(VID_COOKIE, vid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  let committeeId = null;
  if (slug) {
    const row = db.prepare('SELECT id FROM committees WHERE slug = ?').get(String(slug));
    if (!row) return res; // unknown committee — ignore
    committeeId = row.id;
  }

  db.prepare('INSERT INTO page_views (committee_id, slug, visitor_id) VALUES (?, ?, ?)').run(
    committeeId,
    slug || null,
    vid
  );
  return res;
}
