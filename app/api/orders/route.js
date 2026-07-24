import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, canFridge, canFridgeView } from '@/lib/auth';
import { listItems } from '@/lib/fridge';
import { listOrders } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!canFridgeView(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  // Orders are placed against الثلاجة items.
  return NextResponse.json({ orders: listOrders(), items: listItems('fridge') });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const note = body.note ? String(body.note).trim().slice(0, 500) : null;
  const rawLines = Array.isArray(body.lines) ? body.lines : [];

  // Snapshot the requested items (name + unit) from الثلاجة.
  const lines = [];
  for (const l of rawLines) {
    const qty = Number(l?.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const item = db.prepare("SELECT * FROM fridge_items WHERE id = ? AND store = 'fridge'").get(String(l?.item_id || ''));
    if (!item) continue;
    lines.push({ item_id: item.id, item_name: item.name, unit: item.unit || null, quantity: qty });
  }
  if (lines.length === 0) return NextResponse.json({ error: 'أضف صنفاً واحداً على الأقل' }, { status: 400 });

  const id = crypto.randomUUID();
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO fridge_orders (id, requester, note) VALUES (?, ?, ?)').run(id, user.name, note);
    const ins = db.prepare(
      'INSERT INTO fridge_order_lines (id, order_id, item_id, item_name, unit, quantity) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const ln of lines) ins.run(crypto.randomUUID(), id, ln.item_id, ln.item_name, ln.unit, ln.quantity);
  });
  tx();

  return NextResponse.json({ id });
}
