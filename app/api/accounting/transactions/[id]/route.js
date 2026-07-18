import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { CURRENCIES } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const existing = db.prepare('SELECT * FROM acc_transactions WHERE id = ?').get(params.id);
  if (!existing) return NextResponse.json({ error: 'الحركة غير موجودة' }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const amount = body.amount !== undefined ? Number(body.amount) : existing.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'المبلغ غير صحيح' }, { status: 400 });
  }
  const currency = CURRENCIES.includes(body.currency) ? body.currency : existing.currency;

  let categoryId = existing.category_id;
  if (existing.type === 'purchase' && body.category_id !== undefined) {
    categoryId = null;
    if (body.category_id) {
      const cat = db.prepare('SELECT id FROM purchase_categories WHERE id = ?').get(String(body.category_id));
      if (cat) categoryId = cat.id;
    }
  }

  const item = body.item !== undefined ? String(body.item || '').trim().slice(0, 300) : existing.item;
  if (existing.type === 'purchase' && !item) {
    return NextResponse.json({ error: 'اسم الصنف مطلوب للمشتريات' }, { status: 400 });
  }
  const party = body.party !== undefined ? String(body.party || '').trim().slice(0, 200) || null : existing.party;
  const description = body.description !== undefined ? String(body.description || '').trim().slice(0, 2000) || null : existing.description;
  const occurredOn = /^\d{4}-\d{2}-\d{2}$/.test(body.occurred_on) ? body.occurred_on : existing.occurred_on;

  db.prepare(
    `UPDATE acc_transactions
     SET amount = ?, currency = ?, category_id = ?, item = ?, party = ?, description = ?, occurred_on = ?
     WHERE id = ?`
  ).run(amount, currency, categoryId, item || null, party, description, occurredOn, params.id);

  // Replace invoice image set if provided.
  if (Array.isArray(body.images)) {
    db.prepare('DELETE FROM acc_transaction_images WHERE transaction_id = ?').run(params.id);
    const urls = body.images.filter((u) => typeof u === 'string' && /^\/api\/uploads\//.test(u)).slice(0, 12);
    const ins = db.prepare('INSERT INTO acc_transaction_images (id, transaction_id, url) VALUES (?, ?, ?)');
    for (const url of urls) ins.run(crypto.randomUUID(), params.id, url);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  db.prepare('DELETE FROM acc_transaction_images WHERE transaction_id = ?').run(params.id);
  db.prepare('DELETE FROM acc_transactions WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
