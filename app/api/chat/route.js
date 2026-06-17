import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function canAccessCommittee(user, committeeId) {
  if (user.role === 'supervisor') return true;
  return user.committee_id === committeeId;
}

function serializeMsg(m) {
  const d = new Date(m.created_at + 'Z');
  const time = d.toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { id: m.id, committee_id: m.committee_id, author_id: m.author_id, author: m.author_name, text: m.text, time };
}

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const committeeId = searchParams.get('committee');
  if (!committeeId) return NextResponse.json({ error: 'committee مطلوب' }, { status: 400 });
  if (!canAccessCommittee(user, committeeId)) return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const rows = db.prepare(
    `SELECT m.*, u.name as author_name FROM chat_messages m
     JOIN users u ON u.id = m.author_id
     WHERE m.committee_id = ?
     ORDER BY m.created_at ASC
     LIMIT 200`
  ).all(committeeId);

  // Update read marker
  db.prepare(
    `INSERT INTO chat_reads (user_id, committee_id, last_read_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id, committee_id) DO UPDATE SET last_read_at = datetime('now')`
  ).run(user.id, committeeId);

  return NextResponse.json({ messages: rows.map(serializeMsg) });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });

  const { committee_id, text } = await req.json().catch(() => ({}));
  if (!committee_id || !text?.trim()) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
  if (!canAccessCommittee(user, committee_id)) return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO chat_messages (id, committee_id, author_id, text) VALUES (?, ?, ?, ?)').run(id, committee_id, user.id, text.trim());

  // Update own read marker
  db.prepare(
    `INSERT INTO chat_reads (user_id, committee_id, last_read_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id, committee_id) DO UPDATE SET last_read_at = datetime('now')`
  ).run(user.id, committee_id);

  const row = db.prepare(`SELECT m.*, u.name as author_name FROM chat_messages m JOIN users u ON u.id = m.author_id WHERE m.id = ?`).get(id);
  return NextResponse.json({ message: serializeMsg(row) });
}
