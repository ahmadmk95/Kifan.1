import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, isAdmin, canViewAdmin } from '@/lib/auth';
import { listCommittees } from '@/lib/committees';
import { uniqueSlug } from '@/lib/slug';
import { cleanRichHtml } from '@/lib/sanitize';

export async function GET() {
  const user = await getCurrentUser();
  if (!canViewAdmin(user)) {
    return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  }
  const committees = db.prepare('SELECT id, name, slug, sort, visibility, updated_at FROM committees ORDER BY sort ASC, name ASC').all();
  return NextResponse.json({ committees });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'اسم اللجنة مطلوب' }, { status: 400 });
  const visibility = ['public', 'private', 'both'].includes(body.visibility) ? body.visibility : 'public';
  const sort = Number.isFinite(+body.sort) ? Math.trunc(+body.sort) : listCommittees({ includePrivate: true }).length + 1;
  const id = crypto.randomUUID();
  const slug = uniqueSlug(db, name);
  const content = cleanRichHtml(body.content_html);
  db.prepare(
    'INSERT INTO committees (id, name, slug, sort, visibility, content_html, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))'
  ).run(id, name, slug, sort, visibility, content);
  return NextResponse.json({ committee: { id, name, slug, sort, visibility } });
}
