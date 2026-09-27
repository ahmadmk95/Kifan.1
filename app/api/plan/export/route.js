import { getPlan } from '@/lib/plan/store';
import { exportWorkbook, exportCsv } from '@/lib/plan/xlsx';
import { ENTITIES } from '@/lib/plan/model';
import { handle, json, requireViewer } from '@/lib/plan/http';

export const dynamic = 'force-dynamic';

// Signed-in users: ?format=xlsx (all tables) or ?format=csv&table=<entity>.
export const GET = handle(async (req) => {
  await requireViewer();
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'xlsx';
  const plan = getPlan();
  const date = new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    const table = url.searchParams.get('table') || 'meal_item';
    if (!ENTITIES[table]) return json({ error: 'جدول غير معروف' }, { status: 400 });
    return new Response(exportCsv(table, plan), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="plan-${table}-${date}.csv"`,
      },
    });
  }
  const buf = await exportWorkbook(plan);
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="plan-arbaeen-2027-${date}.xlsx"`,
    },
  });
});
