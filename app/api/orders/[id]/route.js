import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, canFridge } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const order = db.prepare('SELECT * FROM fridge_orders WHERE id = ?').get(params.id);
  if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const status = body.status === 'prepared' ? 'prepared' : body.status === 'cancelled' ? 'cancelled' : null;
  if (!status) return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
  if (order.status !== 'pending') return NextResponse.json({ error: 'تمت معالجة هذا الطلب مسبقاً' }, { status: 400 });

  if (status === 'cancelled') {
    db.prepare("UPDATE fridge_orders SET status = 'cancelled' WHERE id = ?").run(params.id);
    return NextResponse.json({ ok: true });
  }

  // Prepare: deduct each line from its الثلاجة item (never below zero) and log it.
  const tx = db.transaction(() => {
    const lines = db.prepare('SELECT * FROM fridge_order_lines WHERE order_id = ?').all(params.id);
    for (const ln of lines) {
      if (!ln.item_id) continue;
      const item = db.prepare("SELECT * FROM fridge_items WHERE id = ? AND store = 'fridge'").get(ln.item_id);
      if (!item) continue;
      const avail = Number(item.quantity);
      const take = Math.min(Number(ln.quantity), avail);
      if (take > 0) {
        const balance = Math.round((avail - take) * 1000) / 1000;
        db.prepare(
          'INSERT INTO fridge_movements (id, item_id, delta, balance, reason, user_name) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(crypto.randomUUID(), ln.item_id, -take, balance, `تجهيز طلب${order.requester ? ' لـ ' + order.requester : ''}`, user.name);
        db.prepare("UPDATE fridge_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(balance, ln.item_id);
      }
    }
    db.prepare("UPDATE fridge_orders SET status = 'prepared', prepared_by = ?, prepared_at = datetime('now') WHERE id = ?").run(user.name, params.id);
  });
  tx();

  return NextResponse.json({ ok: true });
}
