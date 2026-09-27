import { getPlan, ensureDailyBackup } from '@/lib/plan/store';
import { handle, json, requireViewer } from '@/lib/plan/http';

export const dynamic = 'force-dynamic';

// The whole plan — signed-in users only.
export const GET = handle(async () => {
  await requireViewer();
  ensureDailyBackup();
  return json(getPlan());
});
