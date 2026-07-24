import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, canFridge, canFridgeView } from '@/lib/auth';
import { listItems, listFridgeSuggestions, listFridgeUnits, normalizeStore } from '@/lib/fridge';
import { BRANCH_VALUES } from '@/lib/fridgeBranches';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!canFridgeView(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const store = normalizeStore(new URL(req.url).searchParams.get('store'));
  return NextResponse.json({
    items: listItems(store),
    units: listFridgeUnits(store),
    suggestions: listFridgeSuggestions(store),
  });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 200);
  if (!name) return NextResponse.json({ error: 'اسم الصنف مطلوب' }, { status: 400 });

  const store = normalizeStore(body.store);
  // Only the multi-branch fridge uses locations; دار الجيل is a single store.
  const location = store === 'fridge' && BRANCH_VALUES.includes(body.location) ? body.location : (store === 'fridge' ? 'fridge' : 'main');
  const unit = body.unit ? String(body.unit).trim().slice(0, 40) : null;
  const note = body.note ? String(body.note).trim().slice(0, 2000) : null;
  const imageUrl = typeof body.image_url === 'string' && /^\/api\/uploads\//.test(body.image_url) ? body.image_url : null;

  const quantity = Number(body.quantity);
  const startQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const minRaw = Number(body.min_qty);
  const minQty = body.min_qty === null || body.min_qty === undefined || body.min_qty === '' || !Number.isFinite(minRaw) || minRaw < 0 ? null : minRaw;

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO fridge_items (id, store, name, location, unit, quantity, min_qty, image_url, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, store, name, location, unit, startQty, minQty, imageUrl, note);

  // Record the opening balance as the first movement, so history is complete.
  if (startQty > 0) {
    db.prepare(
      `INSERT INTO fridge_movements (id, item_id, delta, balance, reason, user_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), id, startQty, startQty, 'رصيد افتتاحي', user.name);
  }

  return NextResponse.json({ id });
}
