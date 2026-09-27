import { readSnapshot, planFromDump } from '@/lib/plan/store';
import { exportWorkbook } from '@/lib/plan/xlsx';
import { handle, requireEditor } from '@/lib/plan/http';

export const dynamic = 'force-dynamic';

// Download one snapshot as an Excel file.
export const GET = handle(async (req, { params }) => {
  await requireEditor();
  const snap = readSnapshot(params.id);
  const buf = await exportWorkbook(planFromDump(snap.dump));
  const name = `plan-backup-${snap.created_at.slice(0, 16).replace(/[:T]/g, '-')}.xlsx`;
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  });
});
