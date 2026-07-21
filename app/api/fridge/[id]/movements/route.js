import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, canFridge } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Record a stock movement: direction 'in' (إدخال) or 'out' (إخراج) with a positive amount.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const item = db.prepare('SELECT * FROM fridge_items WHERE id = ?').get(params.id);
  if (!item) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'أدخل كمية صحيحة' }, { status: 400 });
  }
  const dir = body.direction === 'out' ? 'out' : 'in';
  const delta = dir === 'out' ? -amount : amount;
  const balance = Math.round((Number(item.quantity) + delta) * 1000) / 1000;
  if (balance < 0) {
    return NextResponse.json({ error: 'الكمية المطلوبة أكبر من المتوفّر' }, { status: 400 });
  }
  const reason = body.reason ? String(body.reason).trim().slice(0, 500) : null;

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO fridge_movements (id, item_id, delta, balance, reason, user_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), params.id, delta, balance, reason, user.name);
    db.prepare("UPDATE fridge_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(balance, params.id);
  });
  tx();

  return NextResponse.json({ ok: true, balance });
}
