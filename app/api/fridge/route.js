import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, canFridge, canFridgeView } from '@/lib/auth';
import { listItems, listFridgeSuggestions, listFridgeCategories } from '@/lib/fridge';
import { BRANCH_VALUES } from '@/lib/fridgeBranches';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!canFridgeView(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  return NextResponse.json({
    items: listItems(),
    categories: listFridgeCategories(),
    suggestions: listFridgeSuggestions(),
  });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 200);
  if (!name) return NextResponse.json({ error: 'اسم الصنف مطلوب' }, { status: 400 });

  const location = BRANCH_VALUES.includes(body.location) ? body.location : 'fridge';
  let categoryId = null;
  if (body.category_id) {
    const cat = db.prepare('SELECT id FROM fridge_categories WHERE id = ?').get(String(body.category_id));
    if (cat) categoryId = cat.id;
  }
  const unit = body.unit ? String(body.unit).trim().slice(0, 40) : null;
  const note = body.note ? String(body.note).trim().slice(0, 2000) : null;
  const imageUrl = typeof body.image_url === 'string' && /^\/api\/uploads\//.test(body.image_url) ? body.image_url : null;

  const quantity = Number(body.quantity);
  const startQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const minRaw = Number(body.min_qty);
  const minQty = Number.isFinite(minRaw) && minRaw >= 0 ? minRaw : null;

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO fridge_items (id, name, location, category_id, unit, quantity, min_qty, image_url, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, location, categoryId, unit, startQty, minQty, imageUrl, note);

  // Record the opening balance as the first movement, so history is complete.
  if (startQty > 0) {
    db.prepare(
      `INSERT INTO fridge_movements (id, item_id, delta, balance, reason, user_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), id, startQty, startQty, 'رصيد افتتاحي', user.name);
  }

  return NextResponse.json({ id });
}
