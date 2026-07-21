import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, canFridge, canFridgeView } from '@/lib/auth';
import { getItem } from '@/lib/fridge';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!canFridgeView(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const item = getItem(params.id);
  if (!item) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const existing = db.prepare('SELECT * FROM fridge_items WHERE id = ?').get(params.id);
  if (!existing) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const name = body.name !== undefined ? String(body.name || '').trim().slice(0, 200) : existing.name;
  if (!name) return NextResponse.json({ error: 'اسم الصنف مطلوب' }, { status: 400 });

  const unit = body.unit !== undefined ? (String(body.unit || '').trim().slice(0, 40) || null) : existing.unit;
  const note = body.note !== undefined ? (String(body.note || '').trim().slice(0, 2000) || null) : existing.note;

  let imageUrl = existing.image_url;
  if (body.image_url !== undefined) {
    imageUrl = typeof body.image_url === 'string' && /^\/api\/uploads\//.test(body.image_url) ? body.image_url : null;
  }

  let minQty = existing.min_qty;
  if (body.min_qty !== undefined) {
    const minRaw = Number(body.min_qty);
    minQty = body.min_qty === null || body.min_qty === '' || !Number.isFinite(minRaw) || minRaw < 0 ? null : minRaw;
  }

  db.prepare(
    `UPDATE fridge_items SET name = ?, unit = ?, min_qty = ?, image_url = ?, note = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(name, unit, minQty, imageUrl, note, params.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  db.prepare('DELETE FROM fridge_movements WHERE item_id = ?').run(params.id);
  db.prepare('DELETE FROM fridge_items WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
