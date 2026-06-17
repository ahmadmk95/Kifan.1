import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, isLead } from '@/lib/auth';
import { formatTime } from '@/lib/serialize';

function serializeRating(r, authorName, isNew = false) {
  return {
    id: r.id,
    member_id: r.member_id,
    author_id: r.author_id,
    author: authorName,
    rating: r.rating,
    comment: r.comment,
    seen_at: r.seen_at || null,
    is_new: isNew,
    time: formatTime(r.created_at),
  };
}

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('member');
  const all = searchParams.get('all') === '1';

  // Supervisor requesting all ratings at once
  if (all) {
    if (!isLead(user)) return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    const rows = user.role === 'supervisor'
      ? db.prepare(
          `SELECT r.*, u.name as author_name, m.name as member_name
           FROM ratings r
           JOIN users u ON u.id = r.author_id
           JOIN users m ON m.id = r.member_id
           ORDER BY r.created_at DESC`
        ).all()
      : db.prepare(
          `SELECT r.*, u.name as author_name, m.name as member_name
           FROM ratings r
           JOIN users u ON u.id = r.author_id
           JOIN users m ON m.id = r.member_id
           WHERE m.committee_id = ?
           ORDER BY r.created_at DESC`
        ).all(user.committee_id);
    return NextResponse.json({
      ratings: rows.map((r) => ({ ...serializeRating(r, r.author_name), member_name: r.member_name })),
    });
  }

  let targetId = memberId || user.id;
  if (targetId !== user.id) {
    if (!isLead(user)) return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
    if (user.role === 'committee_supervisor' && target.committee_id !== user.committee_id) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }
  }

  const rows = db
    .prepare(
      `SELECT r.*, u.name as author_name FROM ratings r JOIN users u ON u.id = r.author_id WHERE r.member_id = ? ORDER BY r.created_at DESC`
    )
    .all(targetId);

  // When a member fetches their own ratings, mark all unseen ones as seen now
  if (targetId === user.id) {
    const unseenIds = new Set(rows.filter((r) => !r.seen_at).map((r) => r.id));
    if (unseenIds.size) {
      const markSeen = db.prepare(`UPDATE ratings SET seen_at = datetime('now') WHERE id = ?`);
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      db.transaction(() => rows.filter((r) => unseenIds.has(r.id)).forEach((r) => markSeen.run(r.id)))();
      rows.forEach((r) => { if (unseenIds.has(r.id)) r.seen_at = now; });
    }
    return NextResponse.json({ ratings: rows.map((r) => serializeRating(r, r.author_name, unseenIds.has(r.id))) });
  }

  return NextResponse.json({ ratings: rows.map((r) => serializeRating(r, r.author_name, false)) });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (!isLead(user)) return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { memberId, rating, comment } = body;
  const ratingNum = Number(rating);
  if (!memberId || !ratingNum || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
  }

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(memberId);
  if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  if (user.role === 'committee_supervisor' && target.committee_id !== user.committee_id) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
  }

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO ratings (id, member_id, author_id, rating, comment) VALUES (?, ?, ?, ?, ?)').run(
    id,
    memberId,
    user.id,
    ratingNum,
    (comment || '').trim()
  );

  const row = db.prepare('SELECT * FROM ratings WHERE id = ?').get(id);
  return NextResponse.json({ rating: serializeRating(row, user.name) });
}
