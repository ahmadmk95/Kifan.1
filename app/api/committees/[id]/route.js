import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { uniqueSlug } from '@/lib/slug';
import { cleanRichHtml } from '@/lib/sanitize';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const committee = db.prepare('SELECT * FROM committees WHERE id = ?').get(params.id);
  if (!committee) return NextResponse.json({ error: 'اللجنة غير موجودة' }, { status: 404 });
  return NextResponse.json({ committee });
}

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const existing = db.prepare('SELECT * FROM committees WHERE id = ?').get(params.id);
  if (!existing) return NextResponse.json({ error: 'اللجنة غير موجودة' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = body.name !== undefined ? String(body.name).trim() : existing.name;
  if (!name) return NextResponse.json({ error: 'اسم اللجنة مطلوب' }, { status: 400 });
  const visibility = ['public', 'private', 'both'].includes(body.visibility) ? body.visibility : existing.visibility;
  const sort = body.sort !== undefined && Number.isFinite(+body.sort) ? Math.trunc(+body.sort) : existing.sort;
  const slug = name !== existing.name ? uniqueSlug(db, name, existing.id) : existing.slug;
  const content = body.content_html !== undefined ? cleanRichHtml(body.content_html) : existing.content_html;

  db.prepare(
    'UPDATE committees SET name = ?, slug = ?, sort = ?, visibility = ?, content_html = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(name, slug, sort, visibility, content, existing.id);
  return NextResponse.json({ committee: { id: existing.id, name, slug, sort, visibility } });
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  db.prepare('DELETE FROM committees WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
