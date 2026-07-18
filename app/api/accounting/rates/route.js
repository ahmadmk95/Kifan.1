import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getRates } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function PUT(req) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const upsert = db.prepare(
    `INSERT INTO fx_rates (currency, per_100_usd) VALUES (?, ?)
     ON CONFLICT(currency) DO UPDATE SET per_100_usd = excluded.per_100_usd`
  );

  for (const cur of ['IQD', 'KWD']) {
    if (body[cur] !== undefined) {
      const v = Number(body[cur]);
      if (!Number.isFinite(v) || v <= 0) {
        return NextResponse.json({ error: `سعر ${cur} غير صحيح` }, { status: 400 });
      }
      upsert.run(cur, v);
    }
  }
  // USD is always the base
  upsert.run('USD', 100);

  return NextResponse.json({ rates: getRates() });
}
