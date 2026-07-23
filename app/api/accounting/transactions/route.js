import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser, canAccounting } from '@/lib/auth';
import { CURRENCIES, resolveProfileId } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!canAccounting(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const type = body.type === 'donation' ? 'donation' : body.type === 'purchase' ? 'purchase' : null;
  if (!type) return NextResponse.json({ error: 'نوع الحركة غير صحيح' }, { status: 400 });

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'المبلغ غير صحيح' }, { status: 400 });
  }
  const currency = CURRENCIES.includes(body.currency) ? body.currency : 'USD';

  let categoryId = null;
  if (type === 'purchase' && body.category_id) {
    const cat = db.prepare('SELECT id FROM purchase_categories WHERE id = ?').get(String(body.category_id));
    if (cat) categoryId = cat.id;
  }

  const item = body.item ? String(body.item).trim().slice(0, 300) : null;
  if (type === 'purchase' && !item) {
    return NextResponse.json({ error: 'اسم الصنف مطلوب للمشتريات' }, { status: 400 });
  }
  const party = body.party ? String(body.party).trim().slice(0, 200) : null;
  const description = body.description ? String(body.description).trim().slice(0, 2000) : null;
  const occurredOn = /^\d{4}-\d{2}-\d{2}$/.test(body.occurred_on) ? body.occurred_on : null;
  const profileId = resolveProfileId(body.profile_id);

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO acc_transactions (id, profile_id, type, amount, currency, category_id, item, party, description, occurred_on)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, date('now')))`
  ).run(id, profileId, type, amount, currency, categoryId, item, party, description, occurredOn);

  const images = Array.isArray(body.images) ? body.images.filter((u) => typeof u === 'string' && /^\/api\/uploads\//.test(u)) : [];
  const insImg = db.prepare('INSERT INTO acc_transaction_images (id, transaction_id, url) VALUES (?, ?, ?)');
  for (const url of images.slice(0, 12)) insImg.run(crypto.randomUUID(), id, url);

  return NextResponse.json({ id });
}
